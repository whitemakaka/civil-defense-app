/**
 * Vector similarity matching service
 * Computes cosine similarity for candidate records
 */

export interface VectorMatchInput {
  embeddings: Float32Array;
  dim: number;
  candidates: number[];
  queryVec: Float32Array;
}

export function matchVectors(input: VectorMatchInput): Map<number, number> {
  const { embeddings, dim, candidates, queryVec } = input;
  const scores = new Map<number, number>();

  for (const idx of candidates) {
    const similarity = computeDotProduct(embeddings, dim, idx, queryVec);
    scores.set(idx, normalizeToUnit(similarity));
  }

  return scores;
}

export function computeAllVectorScores(
  embeddings: Float32Array,
  dim: number,
  recordCount: number,
  queryVec: Float32Array,
  filterFn?: (idx: number) => boolean
): Map<number, number> {
  const scores = new Map<number, number>();

  for (let idx = 0; idx < recordCount; idx++) {
    if (filterFn && !filterFn(idx)) continue;

    const similarity = computeDotProduct(embeddings, dim, idx, queryVec);
    scores.set(idx, normalizeToUnit(similarity));
  }

  return scores;
}

function computeDotProduct(
  embeddings: Float32Array,
  dim: number,
  idx: number,
  queryVec: Float32Array
): number {
  const offset = idx * dim;
  let dot = 0;

  for (let i = 0; i < dim; i++) {
    dot += queryVec[i] * embeddings[offset + i];
  }

  return dot; // L2-normalized vectors → dot product = cosine similarity
}

function normalizeToUnit(cosine: number): number {
  // Cosine is in [-1, 1], normalize to [0, 1]
  return (cosine + 1) / 2;
}
