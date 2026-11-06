export type SearchLanguage = 'pl' | 'en';

export type SearchErrorCode = 'index' | 'model' | 'search';

export interface CountryDefinition {
  code: string;
  flag: string;
  name: Record<SearchLanguage, string>;
}

export interface SearchConfig {
  local_weight: number;
  global_weight: number;
  top_k: number;
  minimum_query_length: number;
  debounce_ms: number;
  idle_unload_seconds: number;
  relevance_floor?: number;
  relevance_delta?: number;
}

export interface BundleFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface Manifest {
  format: string;
  bundle_id: string;
  note_count: number;
  count: number;
  local_vector_count: number;
  global_vector_count: number;
  embedding_text_separator: string;
  dim: number;
  languages: SearchLanguage[];
  country_codes: string[];
  countries: CountryDefinition[];
  search: SearchConfig;
  model_id: string;
  onnx_file: string;
  tokenizer_file: string;
  query_prefix: string;
  max_length: number;
  model_inputs: string[];
  model_output: string;
  pooling: 'cls';
  normalization: 'l2';
  records_file: string;
  notes_file: string;
  embeddings_file: string;
  embeddings_dtype: 'int8';
  embeddings_scale_file: string;
  embeddings_scale_dtype: 'float16';
  embeddings_quantization: 'symmetric_per_record';
  files: BundleFile[];
}

export interface RecordMeta {
  id: string;
  note_id: string;
  embedding_scope: 'local' | 'global';
  line_index: number | null;
  country_code: string;
  lang: SearchLanguage;
  topic: string;
  subtopic: string | null;
  text: string;
  keywords?: string | null;
  embedding_idx: number;
}

export interface SearchOptions {
  localWeight: number;
  globalWeight: number;
  lang: SearchLanguage;
  topK: number;
}

export interface NoteContent {
  global_embedding_idx: number;
  topic: string;
  subtopic: string | null;
  note: string[];
  sources: NoteSource[];
}

export interface NoteSource {
  source: string;
  title: string;
  country: string;
  pages: number[];
  url?: string;
}

export interface NoteMeta {
  id: string;
  content: Record<SearchLanguage, NoteContent>;
}

export interface SearchResult extends NoteMeta, NoteContent {
  lang: SearchLanguage;
  matchedLineIndex: number;
  score: number;
  vectorScore: number;
  localVectorScore: number;
  globalVectorScore: number;
}
