package com.anonymous.civildefence.offlinesearch

import java.io.File
import java.nio.file.Files
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacyModelCopiesTest {
  @Test
  fun removesModelCopiesFromEveryEarlierVersionAndKeepsOtherFiles() {
    val cache = Files.createTempDirectory("civil-defense-cache").toFile()
    try {
      val februaryCopy = File(cache, "model.int8.onnx").apply { writeText("old") }
      val bundleCopy = File(cache, "3973ed18ab0adf99a38243bb307b5f3a0bee8436bbc7d21759bf12bb2b4d3c6a-model.fp32.onnx")
        .apply { writeText("old") }
      val unrelated = File(cache, "http-cache.json").apply { writeText("keep") }
      val folder = File(cache, "folder.onnx").apply { mkdir() }

      assertEquals(2, LegacyModelCopies.deleteFrom(cache))
      assertFalse(februaryCopy.exists())
      assertFalse(bundleCopy.exists())
      assertTrue(unrelated.exists())
      assertTrue(folder.exists())
      assertEquals(0, LegacyModelCopies.deleteFrom(cache))
    } finally {
      cache.deleteRecursively()
    }
  }
}
