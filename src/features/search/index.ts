/**
 * Search Feature - Offline Hybrid Search
 *
 * Combines keyword matching (fast) with vector similarity (semantic)
 * for searching civil defense quotes without external server/LLM.
 */

// Types
export type {
  RecordMeta,
  Manifest,
  KeywordIndex,
  HybridIndex,
  SearchOptions,
  SearchResult,
  Embedder,
} from './types';

// Domain services
export {
  matchKeywords,
  selectCandidates,
  matchVectors,
  rankHybrid,
  rankVectorOnly,
} from './domain/services';

// Infrastructure
export { loadBundle } from './infrastructure/loaders';

// Utilities
export { fold, tokenize, normalizeQuery, toPercent, resolveDocTitle } from './utils';

// Hooks
export { useHybridSearch, type DebugInfo } from './hooks/useHybridSearch';

// UI Components
export { ScoreBar, MetaChip, KeywordChips } from './ui/components';
