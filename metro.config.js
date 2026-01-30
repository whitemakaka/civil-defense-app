const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add custom asset extensions
config.resolver.assetExts.push(
  'gguf',
  'npy',     // numpy embeddings
  'jsonl',   // records
  'onnx',    // ONNX model
);

module.exports = config;

