import type { SearchResult, SearchOptions } from '../types';
import type { LoadedBundle } from '../infrastructure/loaders/BundleLoader';
import { matchKeywords, selectCandidates } from '../domain/services/KeywordMatcher';
import { rankHybrid, rankVectorOnly } from '../domain/services/HybridRanker';
import { getEmbedder, getEmbedderType } from '../infrastructure/embedders';
import { OfflineSearchNative } from '../infrastructure/native/OfflineSearchNative';
import type { DebugInfo } from './useSearchState';

async function scoreVectorsNative(queryVec: Float32Array, candidates: number[], dim: number): Promise<Map<number, number>> {
  await OfflineSearchNative.warmup();
  const scores = await OfflineSearchNative.scoreCandidates(queryVec, candidates, dim);
  const out = new Map<number, number>();
  for (let i = 0; i < candidates.length; i++) out.set(candidates[i], scores[i] ?? 0);
  return out;
}

export interface SearchExecutionResult {
  results: SearchResult[];
  debug: DebugInfo;
  embedderType: 'onnx' | 'none';
  isSemanticReady: boolean;
}

export async function executeSearch(
  query: string,
  bundle: LoadedBundle,
  options: SearchOptions
): Promise<SearchExecutionResult> {
  const { topK = 10, alpha = 0.85, beta = 0.15, candidateSetSize = 300, lang, country } = options;

  const { scores: kwScores, tokens, hits } = matchKeywords(query, bundle.keywordIndex);

  const recordFilter = (idx: number): boolean => {
    const rec = bundle.records[idx];
    if (lang && rec.lang !== lang) return false;
    if (country && rec.country && rec.country !== country) return false;
    return true;
  };

  const candidates = selectCandidates(kwScores, candidateSetSize, bundle.records.map(r => r.lang), undefined, recordFilter);

  const embedder = await getEmbedder(bundle.dim);
  const eType = getEmbedderType();
  const queryVec = await embedder.embed(query);

  if (candidates.length === 0) {
    const all = bundle.records.map((_, i) => i).filter(recordFilter);
    const vecScores = await scoreVectorsNative(queryVec, all, bundle.dim);
    const searchResults = rankVectorOnly(bundle.records, vecScores, topK);
    const avgVec = searchResults.length > 0 ? searchResults.reduce((s, r) => s + r.vectorScore, 0) / searchResults.length : 0;

    return {
      results: searchResults,
      debug: { tokens, candidatesCount: 0, keywordHits: hits, mode: 'vector-only', alpha: 1, beta: 0, avgVectorScore: avgVec, avgKeywordScore: 0, embedderType: eType },
      embedderType: eType,
      isSemanticReady: eType === 'onnx' && embedder.isReady(),
    };
  }

  const vecScores = await scoreVectorsNative(queryVec, candidates, bundle.dim);
  const searchResults = rankHybrid({ records: bundle.records, candidates, keywordScores: kwScores, vectorScores: vecScores, alpha, beta, topK });

  const avgVec = searchResults.length > 0 ? searchResults.reduce((s, r) => s + r.vectorScore, 0) / searchResults.length : 0;
  const avgKw = searchResults.length > 0 ? searchResults.reduce((s, r) => s + r.keywordScore, 0) / searchResults.length : 0;

  return {
    results: searchResults,
    debug: { tokens, candidatesCount: candidates.length, keywordHits: hits, mode: 'hybrid', alpha, beta, avgVectorScore: avgVec, avgKeywordScore: avgKw, embedderType: eType },
    embedderType: eType,
    isSemanticReady: eType === 'onnx' && embedder.isReady(),
  };
}
