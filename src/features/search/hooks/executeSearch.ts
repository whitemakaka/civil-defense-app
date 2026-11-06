import type { SearchOptions, SearchResult } from '../types';
import type { LoadedBundle } from '../infrastructure/loaders/BundleLoader';
import { rankSemantic } from '../domain/services/SemanticRanker';
import { getEmbedder, getEmbedderType } from '../infrastructure/embedders';
import { OfflineSearchNative } from '../infrastructure/native/OfflineSearchNative';
import type { DebugInfo } from './useSearchState';

async function scoreVectors(
  queryVector: Float32Array,
  embeddingIndexes: number[],
  dimension: number,
): Promise<Map<number, number>> {
  await OfflineSearchNative.warmup();
  const values = await OfflineSearchNative.scoreCandidates(
    queryVector,
    embeddingIndexes,
    dimension,
  );
  if (values.length !== embeddingIndexes.length) {
    throw new Error('Native semantic scorer returned an invalid result count');
  }
  return new Map(embeddingIndexes.map((index, position) => [index, values[position]]));
}

export interface SearchExecutionResult {
  results: SearchResult[];
  debug: DebugInfo;
  isSemanticReady: boolean;
}

export async function executeSearch(
  query: string,
  bundle: LoadedBundle,
  options: SearchOptions,
): Promise<SearchExecutionResult> {
  const candidates = bundle.records
    .filter(record => record.lang === options.lang)
    .map(record => record.embedding_idx);

  const embedder = await getEmbedder(bundle.manifest);
  const queryVector = await embedder.embed(query);
  const vectorScores = await scoreVectors(queryVector, candidates, bundle.dim);
  const results = rankSemantic({
    records: bundle.records,
    notes: bundle.notes,
    candidates,
    vectorScores,
    localWeight: options.localWeight,
    globalWeight: options.globalWeight,
    topK: options.topK,
  });
  return {
    results,
    debug: {
      avgLocalScore: results.length ? results.reduce((sum, result) => sum + result.localVectorScore, 0) / results.length : 0,
      avgGlobalScore: results.length ? results.reduce((sum, result) => sum + result.globalVectorScore, 0) / results.length : 0,
    },
    isSemanticReady: getEmbedderType() === 'onnx' && embedder.isReady(),
  };
}
