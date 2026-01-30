// ============================================================================
// EMBEDDING MODEL CONFIG
// ============================================================================
// Single source of truth for embedding model compatibility.
// Bundle must be generated with the same model for vector search to work.

export const EMBEDDING_MODEL_ID = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIM = 384;
export const EMBEDDING_DTYPE = 'float16';

// Bundle schema version for compatibility checks
export const BUNDLE_SCHEMA_VERSION = 'v4a';

// Offline bundle path (relative to assets)
export const BUNDLE_PATH = 'offline_bundle';

