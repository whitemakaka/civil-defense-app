package com.anonymous.civildefence.offlinesearch

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class ByteLevelBpeTokenizerTest {
  private fun modelContext(): Int {
    val manifestPath = System.getProperty("civilDefenseManifestPath")
      ?: throw IllegalStateException("Manifest test path is not configured")
    return JSONObject(File(manifestPath).readText(Charsets.UTF_8)).getInt("max_length")
  }

  private fun tokenizer(): ByteLevelBpeTokenizer {
    val path = System.getProperty("civilDefenseTokenizerPath")
      ?: throw IllegalStateException("Tokenizer test path is not configured")
    return ByteLevelBpeTokenizer(JSONObject(File(path).readText(Charsets.UTF_8)))
  }

  @Test
  fun acceptsFullModelContextWithoutPaddingOrTruncation() {
    val tokenizer = tokenizer()
    val limit = modelContext()
    val token = " a"
    val specialCount = tokenizer.encode("", limit).inputIds.size
    assertEquals(specialCount + 1, tokenizer.encode(token, limit).inputIds.size)
    val encoded = tokenizer.encode(token.repeat(limit - specialCount), limit)
    assertEquals(limit, encoded.inputIds.size)
    assertArrayEquals(IntArray(limit) { 1 }, encoded.attentionMask)
  }

  @Test
  fun oversizedQueriesUseTheLongestPrefixWithSpecialTokensPreserved() {
    val tokenizer = tokenizer()
    val limit = modelContext()
    val specialCount = tokenizer.encode("", limit).inputIds.size
    val fullContext = " a".repeat(limit - specialCount)
    val expected = tokenizer.encode(fullContext, limit)
    for (suffix in listOf(" b", " b".repeat(limit))) {
      val encoded = tokenizer.encode(fullContext + suffix, limit)
      assertEquals(limit, encoded.inputIds.size)
      assertArrayEquals(expected.inputIds, encoded.inputIds)
      assertArrayEquals(expected.attentionMask, encoded.attentionMask)
    }
  }

  @Test
  fun matchesPolDenseReferenceTokenizer() {
    val tokenizerPath = System.getProperty("civilDefenseTokenizerPath")
      ?: throw IllegalStateException("Tokenizer test path is not configured")
    val tokenizer = ByteLevelBpeTokenizer(
      JSONObject(File(tokenizerPath).readText(Charsets.UTF_8))
    )
    val cases = listOf(
      Case(
        "[query]: alarm powietrzny",
        intArrayOf(50281, 50285, 13965, 5030, 2880, 38852, 5134, 50282)
      ),
      Case(
        "[query]: co zrobi\u0107 podczas powodzi?",
        intArrayOf(50281, 50285, 820, 1182, 287, 4193, 9948, 7360, 14617, 284, 5030, 351, 9877, 32, 50282)
      ),
      Case(
        "[query]: apteczka i woda na 72 godziny",
        intArrayOf(50281, 50285, 13390, 886, 91, 4530, 891, 259, 17457, 5549, 8187, 7122, 91, 5104, 50282)
      ),
      Case(
        "[query]: air raid warning",
        intArrayOf(50281, 50285, 2329, 25682, 9734, 50282)
      ),
      Case(
        "[query]: emergency kit for evacuation",
        intArrayOf(50281, 50285, 8945, 6119, 323, 39774, 50282)
      ),
      Case(
        "[query]: \u0141otwa \u2014 bezpiecze\u0144stwo dzieci",
        intArrayOf(50281, 50285, 6078, 212, 302, 8754, 1905, 36394, 10448, 68, 2721, 20729, 296, 680, 277, 29879, 5297, 50282)
      )
    )

    for (case in cases) {
      val encoded = tokenizer.encode(case.text, modelContext())
      val expectedMask = IntArray(case.ids.size) { 1 }
      assertArrayEquals(case.text, case.ids, encoded.inputIds)
      assertArrayEquals(case.text, expectedMask, encoded.attentionMask)
    }
  }

  private data class Case(val text: String, val ids: IntArray)

}
