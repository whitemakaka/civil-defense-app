/**
 * Hybrid ranking service
 * Combines keyword and vector scores with configurable weights
 */

import type { RecordMeta, SearchResult } from '../../types';

export interface RankingInput {
  records: RecordMeta[];
  candidates: number[];
  keywordScores: Map<number, number>;
  vectorScores: Map<number, number>;
  alpha: number; // vector weight
  beta: number;  // keyword weight
  topK: number;
}

export function rankHybrid(input: RankingInput): SearchResult[] {
  const { records, candidates, keywordScores, vectorScores, alpha, beta, topK } = input;

  const maxKw = Math.max(...keywordScores.values(), 1);

  const results: SearchResult[] = candidates.map(idx => {
    const kwNorm = (keywordScores.get(idx) ?? 0) / maxKw;
    const vecScore = vectorScores.get(idx) ?? 0;
    const finalScore = alpha * vecScore + beta * kwNorm;

    return {
      ...mapRecordToResult(records[idx]),
      score: finalScore,
      keywordScore: kwNorm,
      vectorScore: vecScore,
    };
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function mapRecordToResult(r: RecordMeta): Omit<SearchResult, 'score' | 'keywordScore' | 'vectorScore'> {
  return {
    id: r.id,
    country: r.country,
    lang: r.lang,
    title: r.title,
    content: r.content,
    doc_title: r.doc_title,
    chapter_title: r.chapter_title,
    page: r.page,
    source: r.source,
    keywords: r.keywords,
  };
}

export function rankVectorOnly(
  records: RecordMeta[],
  vectorScores: Map<number, number>,
  topK: number
): SearchResult[] {
  const entries = [...vectorScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  return entries.map(([idx, score]) => ({
    ...mapRecordToResult(records[idx]),
    score,
    keywordScore: 0,
    vectorScore: score,
  }));
}
