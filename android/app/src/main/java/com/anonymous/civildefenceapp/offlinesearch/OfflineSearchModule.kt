package com.anonymous.civildefenceapp.offlinesearch

import android.content.res.AssetFileDescriptor
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.charset.Charset
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.sqrt
import org.json.JSONObject
import java.security.MessageDigest

class OfflineSearchModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OfflineSearch"

  private val assetBundleRoot = "offline_bundle"
  private val manifestRelPath = "$assetBundleRoot/manifest.json"
  private val embeddingsRelPath = "$assetBundleRoot/embeddings.int8.bin"
  private val scalesRelPath = "$assetBundleRoot/embeddings.scale.f16.npy"
  private val spModelRelPath = "$assetBundleRoot/model/tokenizer.model"
  private val spSpecialTokensRelPath = "$assetBundleRoot/model/special_tokens.json"

  @Volatile private var embeddingsBuf: ByteBuffer? = null
  @Volatile private var scalesBuf: ByteBuffer? = null
  @Volatile private var scalesDataOffset: Int = -1

  @Volatile private var sp: SentencePieceUnigramTokenizer? = null
  @Volatile private var bundleCacheKey: String? = null

  @ReactMethod
  fun warmup(promise: Promise) {
    try {
      ensureSemanticFilesMapped()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_WARMUP", e.message, e)
    }
  }

  @ReactMethod
  fun tokenize(text: String, maxLength: Int, promise: Promise) {
    try {
      val tok = ensureSentencePieceTokenizer()
      val encoded = tok.encode(text, maxLength)
      val out = Arguments.createMap()
      out.putArray("inputIds", toWritableIntArray(encoded.inputIds))
      out.putArray("attentionMask", toWritableIntArray(encoded.attentionMask))
      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("E_TOKENIZE", e.message, e)
    }
  }

  @ReactMethod
  fun scoreCandidates(
    queryVec: ReadableArray,
    candidates: ReadableArray,
    dim: Int,
    promise: Promise
  ) {
    try {
      ensureSemanticFilesMapped()

      val q = FloatArray(dim)
      for (i in 0 until dim) {
        q[i] = (queryVec.getDouble(i)).toFloat()
      }

      // Best-effort normalize (safe if already normalized).
      l2NormalizeInPlace(q)

      val emb = embeddingsBuf ?: throw IllegalStateException("Embeddings buffer not mapped")
      val scales = scalesBuf ?: throw IllegalStateException("Scales buffer not mapped")
      val dataOffset = scalesDataOffset
      if (dataOffset < 0) throw IllegalStateException("Invalid NPY scale offset")

      val out = Arguments.createArray()
      val n = candidates.size()
      for (k in 0 until n) {
        val idx = candidates.getInt(k)
        val dotInt8 = dotQueryWithInt8Row(emb, idx, dim, q)
        val scale = readFloat16Scale(scales, dataOffset, idx)
        val cosine = dotInt8 * scale
        val score01 = ((cosine + 1f) * 0.5f).coerceIn(0f, 1f)
        out.pushDouble(score01.toDouble())
      }

      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("E_SCORE", e.message, e)
    }
  }

  private fun ensureSemanticFilesMapped() {
    if (embeddingsBuf != null && scalesBuf != null && scalesDataOffset >= 0) return

    synchronized(this) {
      if (embeddingsBuf == null) {
        embeddingsBuf = mapAssetOrCopyToCache(embeddingsRelPath)
      }
      if (scalesBuf == null) {
        val mapped = mapAssetOrCopyToCache(scalesRelPath)
        scalesBuf = mapped
        scalesDataOffset = parseNpyHeader(mapped)
      }
    }
  }

  private fun ensureSentencePieceTokenizer(): SentencePieceUnigramTokenizer {
    val existing = sp
    if (existing != null) return existing

    synchronized(this) {
      val again = sp
      if (again != null) return again

      val modelBytes = readAssetBytes(spModelRelPath)
      val specialJson = String(readAssetBytes(spSpecialTokensRelPath), Charset.forName("UTF-8"))
      val special = JSONObject(specialJson)
      val bosId = special.optInt("bos_token_id", 0)
      val eosId = special.optInt("eos_token_id", 2)
      val padId = special.optInt("pad_token_id", 1)
      val unkId = special.optInt("unk_token_id", 3)
      val usesMetaspace = special.optBoolean("uses_metaspace", true)

      val created = SentencePieceUnigramTokenizer(
        modelBytes = modelBytes,
        bosId = bosId,
        eosId = eosId,
        padId = padId,
        unkId = unkId,
        usesMetaspace = usesMetaspace
      )
      sp = created
      return created
    }
  }

  private fun readAssetBytes(assetRelPath: String): ByteArray {
    val am = reactContext.assets
    am.open(assetRelPath).use { input ->
      return input.readBytes()
    }
  }

  private fun toWritableIntArray(values: IntArray): WritableArray {
    val arr = Arguments.createArray()
    for (v in values) arr.pushInt(v)
    return arr
  }

  private fun mapAssetOrCopyToCache(assetRelPath: String): ByteBuffer {
    // Prefer mmap directly from assets if file is stored uncompressed (openFd works).
    val am = reactContext.assets
    try {
      val afd: AssetFileDescriptor = am.openFd(assetRelPath)
      afd.use {
        val inStream = it.createInputStream() as FileInputStream
        inStream.use { fis ->
          val fc = fis.channel
          fc.use { ch ->
            val mapped = ch.map(FileChannel.MapMode.READ_ONLY, it.startOffset, it.length)
            mapped.order(ByteOrder.LITTLE_ENDIAN)
            return mapped
          }
        }
      }
    } catch (_: Exception) {
      // Asset might be compressed; fall back to copying to cache and mmap the file.
    }

    // IMPORTANT:
    // We version the cache by manifest.json so replacing the bundle in assets
    // won't keep using stale cached files from a previous install.
    val outFile = File(
      reactContext.cacheDir,
      "${getBundleCacheKey()}__${assetRelPath.replace('/', '_')}"
    )
    if (!outFile.exists() || outFile.length() == 0L) {
      outFile.parentFile?.mkdirs()
      am.open(assetRelPath).use { input ->
        FileOutputStream(outFile).use { output ->
          input.copyTo(output)
        }
      }
    }

    FileInputStream(outFile).use { fis ->
      val ch = fis.channel
      val mapped = ch.map(FileChannel.MapMode.READ_ONLY, 0, outFile.length())
      mapped.order(ByteOrder.LITTLE_ENDIAN)
      return mapped
    }
  }

  private fun getBundleCacheKey(): String {
    val existing = bundleCacheKey
    if (existing != null) return existing

    synchronized(this) {
      val again = bundleCacheKey
      if (again != null) return again

      val key = try {
        val raw = readAssetBytes(manifestRelPath)
        // Allow external pipelines to set a stable bundle_id/revision to control caching.
        val json = JSONObject(String(raw, Charset.forName("UTF-8")))
        val explicit = json.optString("bundle_id", "").ifBlank { json.optString("bundle_revision", "") }
        if (explicit.isNotBlank()) {
          explicit
        } else {
          sha256Hex(raw).take(12)
        }
      } catch (_: Exception) {
        // If manifest isn't readable, fallback to a constant to keep behavior predictable.
        "no_manifest"
      }

      bundleCacheKey = key
      return key
    }
  }

  private fun sha256Hex(data: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(data)
    val sb = StringBuilder(digest.size * 2)
    for (b in digest) sb.append(String.format("%02x", b))
    return sb.toString()
  }

  private fun dotQueryWithInt8Row(emb: ByteBuffer, rowIdx: Int, dim: Int, q: FloatArray): Float {
    val base = rowIdx * dim
    var acc = 0f
    for (j in 0 until dim) {
      val b = emb.get(base + j).toInt() // signed int8
      acc += q[j] * b.toFloat()
    }
    return acc
  }

  private fun readFloat16Scale(scales: ByteBuffer, dataOffset: Int, rowIdx: Int): Float {
    val pos = dataOffset + rowIdx * 2
    val h = scales.getShort(pos)
    return halfToFloat(h)
  }

  private fun parseNpyHeader(buf: ByteBuffer): Int {
    // Magic: \x93NUMPY
    if (buf.get(0) != 0x93.toByte() ||
      buf.get(1) != 'N'.code.toByte() ||
      buf.get(2) != 'U'.code.toByte() ||
      buf.get(3) != 'M'.code.toByte() ||
      buf.get(4) != 'P'.code.toByte() ||
      buf.get(5) != 'Y'.code.toByte()
    ) {
      throw IllegalArgumentException("Invalid NPY magic")
    }

    val major = buf.get(6).toInt()
    val headerLen = if (major == 1) {
      (buf.getShort(8).toInt() and 0xFFFF)
    } else {
      buf.getInt(8)
    }
    val headerOffset = if (major == 1) 10 else 12
    return headerOffset + headerLen
  }

  private fun halfToFloat(h: Short): Float {
    val bits = h.toInt() and 0xFFFF
    val sign = (bits ushr 15) and 0x1
    val exp = (bits ushr 10) and 0x1F
    val frac = bits and 0x3FF

    val fBits = when (exp) {
      0 -> {
        if (frac == 0) {
          sign shl 31
        } else {
          // Subnormal
          var e = -14
          var f = frac
          while ((f and 0x400) == 0) {
            f = f shl 1
            e -= 1
          }
          f = f and 0x3FF
          val exp32 = (e + 127) shl 23
          val frac32 = f shl 13
          (sign shl 31) or exp32 or frac32
        }
      }
      31 -> {
        // Inf/NaN
        val exp32 = 0xFF shl 23
        val frac32 = frac shl 13
        (sign shl 31) or exp32 or frac32
      }
      else -> {
        val exp32 = (exp - 15 + 127) shl 23
        val frac32 = frac shl 13
        (sign shl 31) or exp32 or frac32
      }
    }

    return java.lang.Float.intBitsToFloat(fBits)
  }

  private fun l2NormalizeInPlace(v: FloatArray) {
    var sum = 0f
    for (x in v) sum += x * x
    val n = sqrt(sum.toDouble()).toFloat()
    if (n <= 0f) return
    for (i in v.indices) v[i] /= n
  }
}

private data class EncodedTokens(
  val inputIds: IntArray,
  val attentionMask: IntArray
)

/**
 * Minimal SentencePiece Unigram tokenizer implementation.
 * - Loads vocab from tokenizer.model (SentencePiece ModelProto)
 * - Encodes with Viterbi DP
 * - Applies metaspace normalization (▁) when enabled
 *
 * NOTE: This is intentionally scoped to our v4a bundle needs.
 */
private class SentencePieceUnigramTokenizer(
  modelBytes: ByteArray,
  private val bosId: Int,
  private val eosId: Int,
  private val padId: Int,
  private val unkId: Int,
  private val usesMetaspace: Boolean
) {
  private val pieceToId: HashMap<String, Int>
  private val scores: FloatArray
  private val lengths: IntArray
  private val unkScore: Float

  init {
    val pieces = SentencePieceModelProtoParser.parsePieces(modelBytes)
    pieceToId = HashMap(pieces.size * 2)
    scores = FloatArray(pieces.size)

    var maxLen = 1
    val lengthSet = HashSet<Int>()
    var localUnkScore = -100f

    for ((id, p) in pieces.withIndex()) {
      pieceToId[p.piece] = id
      scores[id] = p.score
      if (p.piece.length > maxLen) maxLen = p.piece.length
      lengthSet.add(p.piece.length)
      if (id == unkId) localUnkScore = p.score
    }

    unkScore = localUnkScore
    lengths = lengthSet.toIntArray().sortedArray()
  }

  fun encode(text: String, maxLength: Int): EncodedTokens {
    val normalized = normalize(text)
    val pieceIds = viterbiEncode(normalized)

    // [BOS] tokens [EOS]
    val ids = IntArray(maxLength) { padId }
    val mask = IntArray(maxLength) { 0 }

    var pos = 0
    fun push(id: Int) {
      if (pos >= maxLength) return
      ids[pos] = id
      mask[pos] = if (id == padId) 0 else 1
      pos++
    }

    push(bosId)
    for (id in pieceIds) push(id)
    push(eosId)

    return EncodedTokens(inputIds = ids, attentionMask = mask)
  }

  private fun normalize(text: String): String {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) return if (usesMetaspace) "▁" else ""

    if (!usesMetaspace) return trimmed

    // Best-effort metaspace normalization: collapse whitespace and replace spaces with ▁.
    val collapsed = trimmed.replace(Regex("\\s+"), " ")
    return "▁" + collapsed.replace(' ', '▁')
  }

  private fun viterbiEncode(s: String): IntArray {
    val n = s.length
    if (n == 0) return IntArray(0)

    val dp = FloatArray(n + 1) { Float.NEGATIVE_INFINITY }
    val nextPos = IntArray(n + 1) { -1 }
    val nextId = IntArray(n + 1) { unkId }
    dp[n] = 0f
    nextPos[n] = n

    for (i in n - 1 downTo 0) {
      var bestScore = Float.NEGATIVE_INFINITY
      var bestNext = i + 1
      var bestId = unkId

      for (len in lengths) {
        val j = i + len
        if (j > n) break
        val sub = s.substring(i, j)
        val id = pieceToId[sub]
        if (id != null) {
          val score = scores[id] + dp[j]
          if (score > bestScore) {
            bestScore = score
            bestNext = j
            bestId = id
          }
        }
      }

      if (bestScore == Float.NEGATIVE_INFINITY) {
        bestScore = unkScore + dp[i + 1]
        bestNext = i + 1
        bestId = unkId
      }

      dp[i] = bestScore
      nextPos[i] = bestNext
      nextId[i] = bestId
    }

    // Backtrack
    val out = ArrayList<Int>(n)
    var i = 0
    while (i < n) {
      val id = nextId[i]
      out.add(id)
      val j = nextPos[i]
      if (j <= i) break
      i = j
    }

    return out.toIntArray()
  }
}

private data class SpPiece(val piece: String, val score: Float)

private object SentencePieceModelProtoParser {
  fun parsePieces(modelBytes: ByteArray): List<SpPiece> {
    // ModelProto { repeated SentencePiece pieces = 1; }
    val out = ArrayList<SpPiece>(32_000)
    val r = ProtoReader(modelBytes)
    while (!r.eof()) {
      val tag = r.readVarint32()
      val field = tag ushr 3
      val wire = tag and 0x7
      if (field == 1 && wire == 2) {
        val msgLen = r.readVarint32()
        val msgBytes = r.readBytes(msgLen)
        val piece = parseSentencePiece(msgBytes)
        if (piece != null) out.add(piece)
      } else {
        r.skip(wire)
      }
    }
    return out
  }

  private fun parseSentencePiece(bytes: ByteArray): SpPiece? {
    // SentencePiece { string piece = 1; float score = 2; enum Type type = 3; }
    val r = ProtoReader(bytes)
    var pieceStr: String? = null
    var score = 0f
    while (!r.eof()) {
      val tag = r.readVarint32()
      val field = tag ushr 3
      val wire = tag and 0x7
      when (field) {
        1 -> {
          if (wire != 2) {
            r.skip(wire)
          } else {
            val len = r.readVarint32()
            pieceStr = r.readString(len)
          }
        }
        2 -> {
          if (wire != 5) {
            r.skip(wire)
          } else {
            score = r.readFixed32Float()
          }
        }
        else -> r.skip(wire)
      }
    }
    if (pieceStr == null) return null
    return SpPiece(piece = pieceStr!!, score = score)
  }
}

private class ProtoReader(private val bytes: ByteArray) {
  private var pos: Int = 0

  fun eof(): Boolean = pos >= bytes.size

  fun readVarint32(): Int {
    var shift = 0
    var result = 0
    while (shift < 32) {
      val b = bytes[pos++].toInt() and 0xFF
      result = result or ((b and 0x7F) shl shift)
      if ((b and 0x80) == 0) return result
      shift += 7
    }
    throw IllegalArgumentException("Malformed varint32")
  }

  fun readBytes(len: Int): ByteArray {
    val out = bytes.copyOfRange(pos, pos + len)
    pos += len
    return out
  }

  fun readString(len: Int): String {
    val s = String(bytes, pos, len, Charsets.UTF_8)
    pos += len
    return s
  }

  fun readFixed32Float(): Float {
    val b0 = bytes[pos++].toInt() and 0xFF
    val b1 = bytes[pos++].toInt() and 0xFF
    val b2 = bytes[pos++].toInt() and 0xFF
    val b3 = bytes[pos++].toInt() and 0xFF
    val bits = b0 or (b1 shl 8) or (b2 shl 16) or (b3 shl 24)
    return java.lang.Float.intBitsToFloat(bits)
  }

  fun skip(wireType: Int) {
    when (wireType) {
      0 -> readVarint32()
      1 -> pos += 8
      2 -> {
        val len = readVarint32()
        pos += len
      }
      5 -> pos += 4
      else -> throw IllegalArgumentException("Unsupported wire type: $wireType")
    }
  }
}

