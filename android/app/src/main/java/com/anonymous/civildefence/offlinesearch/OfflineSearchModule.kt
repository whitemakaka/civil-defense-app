package com.anonymous.civildefence.offlinesearch

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.LongBuffer
import java.nio.channels.FileChannel
import java.text.Normalizer
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.sqrt
import org.json.JSONObject

class OfflineSearchModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OfflineSearch"

  private val manifestPath = "offline_bundle/manifest.json"
  @Volatile private var settings: BundleSettings? = null
  @Volatile private var embeddings: ByteBuffer? = null
  @Volatile private var scales: ByteBuffer? = null
  @Volatile private var scalesOffset: Int = -1
  @Volatile private var tokenizer: ByteLevelBpeTokenizer? = null
  @Volatile private var session: OrtSession? = null

  @ReactMethod
  fun warmup(promise: Promise) {
    try {
      ensureSemanticFilesMapped()
      ensureTokenizer()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_WARMUP", error.message, error)
    }
  }

  /**
   * Opens the ONNX model straight from the installed app (the asset is stored uncompressed and
   * memory-mapped), so no second copy of the model is written to the device.
   */
  @ReactMethod
  fun loadModel(promise: Promise) {
    try {
      ensureSession()
      deleteLegacyModelCopies()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_MODEL", error.message, error)
    }
  }

  /** Tokenizes [text] and returns its embedding as a plain number array. */
  @ReactMethod
  fun embed(text: String, promise: Promise) {
    try {
      val bundle = ensureSettings()
      val currentSession = ensureSession()
      val encoded = ensureTokenizer().encode(text, bundle.maxLength)
      val length = encoded.inputIds.size
      if (length < 2 || length > bundle.maxLength || encoded.attentionMask.size != length) {
        throw IllegalArgumentException("Tokenizer returned an invalid sequence length")
      }
      val environment = OrtEnvironment.getEnvironment()
      val shape = longArrayOf(1L, length.toLong())
      val ids = LongBuffer.wrap(LongArray(length) { encoded.inputIds[it].toLong() })
      val mask = LongBuffer.wrap(LongArray(length) { encoded.attentionMask[it].toLong() })
      val values = OnnxTensor.createTensor(environment, ids, shape).use { idsTensor ->
        OnnxTensor.createTensor(environment, mask, shape).use { maskTensor ->
          currentSession.run(
            mapOf(bundle.modelInputs[0] to idsTensor, bundle.modelInputs[1] to maskTensor)
          ).use { result ->
            val output = result.get(bundle.modelOutput).orElse(null) as? OnnxTensor
              ?: throw IllegalStateException("ONNX output not found: ${bundle.modelOutput}")
            val outputShape = output.info.shape
            if (outputShape.size != 2 || outputShape[0] != 1L || outputShape[1] != bundle.dimension.toLong()) {
              throw IllegalStateException("ONNX model returned an invalid embedding")
            }
            val buffer = output.floatBuffer
            FloatArray(bundle.dimension).also { buffer.get(it) }
          }
        }
      }
      val array = Arguments.createArray()
      for (value in values) array.pushDouble(value.toDouble())
      promise.resolve(array)
    } catch (error: Exception) {
      promise.reject("E_EMBED", error.message, error)
    }
  }

  /** Frees the model's working memory; the model file itself is part of the app. */
  @ReactMethod
  fun releaseModel(promise: Promise) {
    try {
      synchronized(this) {
        session?.close()
        session = null
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_MODEL", error.message, error)
    }
  }

  @ReactMethod
  fun scoreCandidates(
    queryVector: ReadableArray,
    candidates: ReadableArray,
    dimension: Int,
    promise: Promise
  ) {
    try {
      ensureSemanticFilesMapped()
      val bundle = ensureSettings()
      if (dimension != bundle.dimension || queryVector.size() != dimension) {
        throw IllegalArgumentException("Query embedding dimension does not match the bundle")
      }

      val query = FloatArray(dimension) { index ->
        queryVector.getDouble(index).toFloat()
      }
      normalize(query)

      val embeddingBuffer = embeddings
        ?: throw IllegalStateException("Embedding data is not mapped")
      val scaleBuffer = scales
        ?: throw IllegalStateException("Embedding scales are not mapped")
      val output = Arguments.createArray()

      for (position in 0 until candidates.size()) {
        val row = candidates.getInt(position)
        if (row < 0 || row >= bundle.count) {
          throw IndexOutOfBoundsException("Embedding row is outside the bundle")
        }
        val dot = dotInt8Row(embeddingBuffer, row, dimension, query)
        val scale = halfToFloat(scaleBuffer.getShort(scalesOffset + row * 2))
        val cosine = dot * scale
        output.pushDouble(((cosine + 1f) * 0.5f).coerceIn(0f, 1f).toDouble())
      }
      promise.resolve(output)
    } catch (error: Exception) {
      promise.reject("E_SCORE", error.message, error)
    }
  }

  private fun ensureSettings(): BundleSettings {
    val current = settings
    if (current != null) return current
    synchronized(this) {
      val loaded = settings
      if (loaded != null) return loaded
      val manifest = JSONObject(readAssetText(manifestPath))
      val parsed = BundleSettings(
        dimension = manifest.getInt("dim"),
        count = manifest.getInt("count"),
        maxLength = manifest.getInt("max_length"),
        modelPath = "offline_bundle/" + manifest.getString("onnx_file"),
        modelInputs = manifest.getJSONArray("model_inputs").let { inputs ->
          List(inputs.length()) { inputs.getString(it) }
        },
        modelOutput = manifest.getString("model_output"),
        embeddingsPath = "offline_bundle/" + manifest.getString("embeddings_file"),
        scalesPath = "offline_bundle/" + manifest.getString("embeddings_scale_file"),
        tokenizerPath = "offline_bundle/" + manifest.getString("tokenizer_file")
      )
      settings = parsed
      return parsed
    }
  }

  private fun ensureSemanticFilesMapped() {
    if (embeddings != null && scales != null && scalesOffset >= 0) return
    synchronized(this) {
      val bundle = ensureSettings()
      if (embeddings == null) {
        val mapped = mapAsset(bundle.embeddingsPath)
        if (mapped.capacity() != bundle.count * bundle.dimension) {
          throw IllegalArgumentException("Embedding data size does not match the manifest")
        }
        embeddings = mapped
      }
      if (scales == null) {
        val mapped = mapAsset(bundle.scalesPath)
        val offset = parseNpyHeader(mapped)
        if (mapped.capacity() < offset + bundle.count * 2) {
          throw IllegalArgumentException("Embedding scale data is incomplete")
        }
        scales = mapped
        scalesOffset = offset
      }
    }
  }

  private fun ensureSession(): OrtSession {
    val current = session
    if (current != null) return current
    synchronized(this) {
      val loaded = session
      if (loaded != null) return loaded
      val bundle = ensureSettings()
      if (bundle.modelInputs.size != 2) {
        throw IllegalArgumentException("The model must take input ids and an attention mask")
      }
      val created = OrtEnvironment.getEnvironment().createSession(mapAsset(bundle.modelPath))
      try {
        for (name in bundle.modelInputs) {
          if (name !in created.inputNames) throw IllegalArgumentException("ONNX input not found: $name")
        }
        if (bundle.modelOutput !in created.outputNames) {
          throw IllegalArgumentException("ONNX output not found: ${bundle.modelOutput}")
        }
      } catch (error: Exception) {
        created.close()
        throw error
      }
      session = created
      return created
    }
  }

  private fun deleteLegacyModelCopies() {
    LegacyModelCopies.deleteFrom(reactContext.cacheDir)
  }

  private fun ensureTokenizer(): ByteLevelBpeTokenizer {
    val current = tokenizer
    if (current != null) return current
    synchronized(this) {
      val loaded = tokenizer
      if (loaded != null) return loaded
      val created = ByteLevelBpeTokenizer(JSONObject(readAssetText(ensureSettings().tokenizerPath)))
      tokenizer = created
      return created
    }
  }

  private fun readAssetText(path: String): String =
    reactContext.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }

  private fun mapAsset(path: String): ByteBuffer {
    reactContext.assets.openFd(path).use { descriptor ->
      FileInputStream(descriptor.fileDescriptor).channel.use { channel ->
        return channel
          .map(FileChannel.MapMode.READ_ONLY, descriptor.startOffset, descriptor.length)
          .order(ByteOrder.LITTLE_ENDIAN)
      }
    }
  }

  private fun dotInt8Row(
    buffer: ByteBuffer,
    row: Int,
    dimension: Int,
    query: FloatArray
  ): Float {
    val offset = row * dimension
    var result = 0f
    for (column in 0 until dimension) {
      result += query[column] * buffer.get(offset + column).toInt().toFloat()
    }
    return result
  }

  private fun normalize(vector: FloatArray) {
    var squaredNorm = 0f
    for (value in vector) squaredNorm += value * value
    val norm = sqrt(squaredNorm.toDouble()).toFloat()
    if (!norm.isFinite() || norm == 0f) {
      throw IllegalArgumentException("Query embedding cannot be normalized")
    }
    for (index in vector.indices) vector[index] /= norm
  }

  private fun parseNpyHeader(buffer: ByteBuffer): Int {
    if (
      buffer.get(0) != 0x93.toByte() ||
      buffer.get(1) != 'N'.code.toByte() ||
      buffer.get(2) != 'U'.code.toByte() ||
      buffer.get(3) != 'M'.code.toByte() ||
      buffer.get(4) != 'P'.code.toByte() ||
      buffer.get(5) != 'Y'.code.toByte()
    ) {
      throw IllegalArgumentException("Invalid NPY scale file")
    }
    val major = buffer.get(6).toInt() and 0xff
    val headerLength = if (major == 1) {
      buffer.getShort(8).toInt() and 0xffff
    } else {
      buffer.getInt(8)
    }
    return (if (major == 1) 10 else 12) + headerLength
  }

  private fun halfToFloat(value: Short): Float {
    val bits = value.toInt() and 0xffff
    val sign = (bits ushr 15) and 1
    val exponent = (bits ushr 10) and 0x1f
    val fraction = bits and 0x3ff
    val floatBits = when (exponent) {
      0 -> {
        if (fraction == 0) {
          sign shl 31
        } else {
          var normalizedFraction = fraction
          var normalizedExponent = -14
          while ((normalizedFraction and 0x400) == 0) {
            normalizedFraction = normalizedFraction shl 1
            normalizedExponent--
          }
          normalizedFraction = normalizedFraction and 0x3ff
          (sign shl 31) or
            ((normalizedExponent + 127) shl 23) or
            (normalizedFraction shl 13)
        }
      }
      31 -> (sign shl 31) or (0xff shl 23) or (fraction shl 13)
      else -> (sign shl 31) or
        ((exponent - 15 + 127) shl 23) or
        (fraction shl 13)
    }
    return Float.fromBits(floatBits)
  }
}

/**
 * Earlier versions copied the bundled model into the app cache before loading it:
 * versions 1-5 (February 2026) as "model.int8.onnx", versions 11-17 as
 * "<bundle id>-model.fp32.onnx". The model is now read straight from the APK and nothing
 * writes .onnx files to the cache any more, so every such file there is a stale copy.
 */
internal object LegacyModelCopies {
  fun isLegacyCopy(file: File): Boolean =
    file.isFile && file.name.endsWith(".onnx", ignoreCase = true)

  /** Deletes stale model copies directly inside [cacheDir]; returns how many were removed. */
  fun deleteFrom(cacheDir: File): Int =
    cacheDir.listFiles()?.count { file -> isLegacyCopy(file) && file.delete() } ?: 0
}

private data class BundleSettings(
  val dimension: Int,
  val count: Int,
  val maxLength: Int,
  val modelPath: String,
  val modelInputs: List<String>,
  val modelOutput: String,
  val embeddingsPath: String,
  val scalesPath: String,
  val tokenizerPath: String
)

internal data class EncodedTokens(
  val inputIds: IntArray,
  val attentionMask: IntArray
)

private data class AddedToken(val content: String, val id: Int)

internal class ByteLevelBpeTokenizer(tokenizerJson: JSONObject) {
  private val vocabulary: Map<String, Int>
  private val mergeRanks: Map<String, Int>
  private val addedTokens: List<AddedToken>
  private val byteEncoder: Array<String>
  private val clsId: Int
  private val sepId: Int
  private val bpeCache = ConcurrentHashMap<String, IntArray>()
  private val tokenPattern = Regex(
    """(?i:'s|'t|'re|'ve|'m|'ll|'d)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
  )

  init {
    val model = tokenizerJson.getJSONObject("model")
    val vocabularyJson = model.getJSONObject("vocab")
    val vocabularyValues = HashMap<String, Int>(vocabularyJson.length() * 2)
    val vocabularyKeys = vocabularyJson.keys()
    while (vocabularyKeys.hasNext()) {
      val token = vocabularyKeys.next()
      vocabularyValues[token] = vocabularyJson.getInt(token)
    }
    vocabulary = vocabularyValues

    val merges = model.getJSONArray("merges")
    val rankValues = HashMap<String, Int>(merges.length() * 2)
    for (rank in 0 until merges.length()) {
      val pair = merges.getJSONArray(rank)
      rankValues[pair.getString(0) + PAIR_SEPARATOR + pair.getString(1)] = rank
    }
    mergeRanks = rankValues

    val added = tokenizerJson.getJSONArray("added_tokens")
    val addedValues = ArrayList<AddedToken>()
    for (index in 0 until added.length()) {
      val token = added.getJSONObject(index)
      if (!token.getBoolean("special")) {
        addedValues.add(AddedToken(token.getString("content"), token.getInt("id")))
      }
    }
    addedTokens = addedValues.sortedByDescending { it.content.length }

    val specialTokens = tokenizerJson
      .getJSONObject("post_processor")
      .getJSONObject("special_tokens")
    clsId = specialTokenId(specialTokens, "[CLS]")
    sepId = specialTokenId(specialTokens, "[SEP]")
    byteEncoder = buildByteEncoder()
  }

  fun encode(text: String, maxLength: Int): EncodedTokens {
    if (maxLength < 2) throw IllegalArgumentException("Token length must include CLS and SEP")
    val normalized = Normalizer.normalize(text, Normalizer.Form.NFC)
    val contentIds = encodeWithAddedTokens(normalized)
    // Keep the longest prefix that fits, reserving space for CLS and SEP.
    val contentLength = minOf(contentIds.size, maxLength - 2)
    val inputIds = IntArray(contentLength + 2)
    val attentionMask = IntArray(inputIds.size)
    var position = 0
    inputIds[position] = clsId
    attentionMask[position++] = 1
    for (index in 0 until contentLength) {
      inputIds[position] = contentIds[index]
      attentionMask[position++] = 1
    }
    inputIds[position] = sepId
    attentionMask[position] = 1
    return EncodedTokens(inputIds, attentionMask)
  }

  private fun encodeWithAddedTokens(text: String): IntArray {
    val output = ArrayList<Int>()
    var plainStart = 0
    var position = 0
    while (position < text.length) {
      val added = addedTokens.firstOrNull { text.startsWith(it.content, position) }
      if (added == null) {
        position += Character.charCount(text.codePointAt(position))
        continue
      }
      encodePlainText(text.substring(plainStart, position), output)
      output.add(added.id)
      position += added.content.length
      plainStart = position
    }
    encodePlainText(text.substring(plainStart), output)
    return output.toIntArray()
  }

  private fun encodePlainText(text: String, output: MutableList<Int>) {
    for (match in tokenPattern.findAll(text)) {
      val encoded = buildString {
        for (byte in match.value.toByteArray(Charsets.UTF_8)) {
          append(byteEncoder[byte.toInt() and 0xff])
        }
      }
      for (id in applyBpe(encoded)) output.add(id)
    }
  }

  private fun applyBpe(token: String): IntArray {
    val cached = bpeCache[token]
    if (cached != null) return cached

    var symbols = token.map { it.toString() }
    while (symbols.size > 1) {
      var bestRank = Int.MAX_VALUE
      var bestLeft: String? = null
      var bestRight: String? = null
      for (index in 0 until symbols.lastIndex) {
        val rank = mergeRanks[symbols[index] + PAIR_SEPARATOR + symbols[index + 1]]
        if (rank != null && rank < bestRank) {
          bestRank = rank
          bestLeft = symbols[index]
          bestRight = symbols[index + 1]
        }
      }
      if (bestLeft == null || bestRight == null) break

      val merged = ArrayList<String>(symbols.size)
      var index = 0
      while (index < symbols.size) {
        if (
          index < symbols.lastIndex &&
          symbols[index] == bestLeft &&
          symbols[index + 1] == bestRight
        ) {
          merged.add(bestLeft + bestRight)
          index += 2
        } else {
          merged.add(symbols[index])
          index++
        }
      }
      symbols = merged
    }

    val ids = IntArray(symbols.size) { index ->
      vocabulary[symbols[index]]
        ?: throw IllegalArgumentException("Tokenizer vocabulary is missing a BPE symbol")
    }
    bpeCache[token] = ids
    return ids
  }

  private fun specialTokenId(tokens: JSONObject, name: String): Int =
    tokens.getJSONObject(name).getJSONArray("ids").getInt(0)

  private fun buildByteEncoder(): Array<String> {
    val codePoints = IntArray(256) { -1 }
    for (value in 33..126) codePoints[value] = value
    for (value in 161..172) codePoints[value] = value
    for (value in 174..255) codePoints[value] = value
    var extra = 0
    for (value in 0..255) {
      if (codePoints[value] == -1) {
        codePoints[value] = 256 + extra
        extra++
      }
    }
    return Array(256) { value -> String(Character.toChars(codePoints[value])) }
  }

  private companion object {
    const val PAIR_SEPARATOR = '\u0000'
  }
}
