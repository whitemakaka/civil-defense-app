import type { SearchConfig, SearchResult } from '../../types';

export interface RelevanceConfig {
  floor: number;
  delta: number;
}

// Provisional values; calibrated against real queries later.
export const DEFAULT_RELEVANCE: RelevanceConfig = { floor: 0.69, delta: 0.02 };

/**
 * Keeps results that are both above the absolute floor and close to the best score.
 * Preserves the input order.
 */
export function filterRelevant(results: SearchResult[], config: RelevanceConfig): SearchResult[] {
  if (!results.length) return [];
  const top = Math.max(...results.map(result => result.score));
  if (top < config.floor) return [];
  const threshold = Math.max(config.floor, top - config.delta);
  return results.filter(result => result.score >= threshold);
}

export function getRelevanceConfig(searchConfig: SearchConfig): RelevanceConfig {
  return {
    floor: searchConfig.relevance_floor ?? DEFAULT_RELEVANCE.floor,
    delta: searchConfig.relevance_delta ?? DEFAULT_RELEVANCE.delta,
  };
}
