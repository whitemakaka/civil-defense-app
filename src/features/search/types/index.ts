/**
 * Hybrid Search Types
 * Offline keyword + vector search for civil defense quotes
 */

// === Data Bundle Types ===

/**
 * Documents available in PL and EN:
 * - badz_gotowy: "Bądź gotowy – poradnik na czas kryzysu i wojny" (PL) / "Get Ready" (EN)
 * - poradnik_bezpieczenstwa: "Poradnik bezpieczeństwa" (PL) / "Safety Handbook" (EN)
 */
export interface RecordMeta {
  // Required (v2)
  id: string;
  country: string; // ISO 3166-1 alpha-2 (PL, LT, LV, EE...)
  lang: 'pl' | 'en';
  title: string;
  content: string;
  keywords: string[];
  embedding_idx: number;
  doc_title: string;
  chapter_title: string;
  page: number;
  // Optional
  doc_stem?: string;
  source?: string;
  title_clean?: string;
  content_clean?: string;
  keywords_folded?: string[]; // Generated at runtime
}

export interface Manifest {
  // Embedding model info (MUST match runtime embedder)
  model?: string; // legacy (v1/v2)
  model_id?: string; // v3
  dim: number; // embedding dimension (e.g. 384)
  dtype: 'float16' | 'float32'; // legacy embedding dtype (keep for compat)
  
  // Dataset info
  count: number; // number of records
  schema_version: string; // bundle format version (e.g. "v1")
  
  // File references
  records_file: string; // e.g. "records_meta.jsonl"
  embeddings_file: string; // e.g. "embeddings.f16.npy" or "embeddings.int8.bin"
  keyword_index_file?: string; // e.g. "keyword_index.json"

  // v3 extras (on-device embedding)
  onnx_file?: string;
  tokenizer_file?: string;
  tokenizer_type?: 'sentencepiece_unigram' | string;
  max_length?: number;
  pooling?: 'mean' | string;
  normalize?: 'l2' | string;

  // v4a embeddings quantization
  embeddings_dtype?: 'float16' | 'float32' | 'int8' | string;
  embeddings_scale_file?: string;
  embeddings_scale_dtype?: 'float16' | 'float32' | string;
  embeddings_quant?: 'int8_per_vector_scale' | string;

  // v5: tokenizer in model (ORT Extensions / preprocessing in graph)
  preprocessing?: 'in_model' | string;
  requires_ort_extensions?: boolean;
  onnx_format?: 'onnx' | 'ort' | string;
  embedder_io?: {
    input_text_name: string;
    output_embedding_name: string;
  };
}

export type KeywordIndex = Record<string, number[]>; // keyword_folded -> embedding_idx[]

// === Runtime Types ===

export interface HybridIndex {
  records: RecordMeta[];
  embeddings: Float32Array; // flattened N x D matrix
  dim: number;
  keywordIndex: KeywordIndex;
  manifest: Manifest; // keep manifest for validation
}

export interface SearchOptions {
  country?: string; // Filter by country (PL, LT, LV...)
  lang?: 'pl' | 'en'; // Filter by language
  topK?: number;
  alpha?: number; // weight for vector similarity (default 0.85)
  beta?: number;  // weight for keyword score (default 0.15)
  candidateSetSize?: number; // max candidates from keyword stage (default 150-400)
}

export interface SearchResult {
  id: string;
  score: number;
  country: string;
  lang: 'pl' | 'en';
  title: string;
  content: string;
  doc_title: string;
  chapter_title: string;
  page: number;
  source?: string;
  keywords: string[];
  keywordScore: number;
  vectorScore: number;

  // Legacy/compat fields used by UI (older bundles / older record schemas)
  title_clean?: string;
  content_clean?: string;
  doc_stem?: string;
  document?: string;
  document_id?: string;
  document_title?: string;
  documentName?: string;
  chapter?: string;
  section?: string;
  page_number?: number;
  pageNumber?: number;
  distance?: number;
}

// === Embedder Interface ===

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
  embedBatch?(texts: string[]): Promise<Float32Array[]>;
  getOutputDim(): number; // embedder output dimension
  getModelId(): string; // embedder model identifier
}

// === Validation Types ===

export interface BundleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: Manifest;
}

export enum ValidationError {
  MODEL_MISMATCH = 'MODEL_MISMATCH',
  DIM_MISMATCH = 'DIM_MISMATCH',
  COUNT_MISMATCH = 'COUNT_MISMATCH',
  SCHEMA_VERSION_MISMATCH = 'SCHEMA_VERSION_MISMATCH',
  MISSING_FILES = 'MISSING_FILES',
}
