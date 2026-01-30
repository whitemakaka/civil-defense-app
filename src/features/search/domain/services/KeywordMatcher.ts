/**
 * Keyword matching service
 * Finds records by keyword tokens with fuzzy prefix matching
 */

import type { KeywordIndex } from '../../types';
import { normalizeQuery } from '../../utils/textNormalization';

export interface KeywordMatchResult {
  scores: Map<number, number>;
  tokens: string[];
  hits: Record<string, number>;
}

export function matchKeywords(
  query: string,
  index: KeywordIndex,
  minTokenLen = 3
): KeywordMatchResult {
  const tokens = normalizeQuery(query, minTokenLen);
  const scores = new Map<number, number>();
  const hits: Record<string, number> = {};

  for (const token of tokens) {
    const matched = findMatches(token, index);
    hits[token] = matched.reduce((sum, m) => sum + m.indices.length, 0);

    for (const { indices, weight } of matched) {
      for (const idx of indices) {
        scores.set(idx, (scores.get(idx) ?? 0) + weight);
      }
    }
  }

  return { scores, tokens, hits };
}

interface Match {
  indices: number[];
  weight: number;
}

function findMatches(token: string, index: KeywordIndex, maxFuzzy = 5): Match[] {
  const matches: Match[] = [];

  // Exact match (full weight)
  if (index[token]) {
    matches.push({ indices: index[token], weight: 1.0 });
    return matches;
  }

  // Prefix fallback (reduced weight)
  let fuzzyCount = 0;
  for (const [key, indices] of Object.entries(index)) {
    if (fuzzyCount >= maxFuzzy) break;

    const isPrefix = key.startsWith(token) && key.length >= token.length * 0.8;
    const isReverse = token.startsWith(key) && key.length >= 3;

    if (isPrefix || isReverse) {
      matches.push({ indices, weight: 0.7 });
      fuzzyCount++;
    }
  }

  return matches;
}

export function selectCandidates(
  scores: Map<number, number>,
  maxCandidates: number,
  recordLangs: Array<string | undefined>,
  filterLang?: string,
  customFilter?: (idx: number) => boolean
): number[] {
  return [...scores.entries()]
    .filter(([idx]) => {
      if (customFilter && !customFilter(idx)) return false;
      if (filterLang && recordLangs[idx] !== filterLang) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(([idx]) => idx);
}
