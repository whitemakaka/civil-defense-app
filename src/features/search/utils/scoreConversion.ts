/**
 * Score conversion utilities
 * Convert various score/distance formats to percentage
 */

import { toOptionalNumber } from '../../../shared/lib/strings';

export interface ScoreInput {
  score?: unknown;
  relevance?: unknown;
  similarity?: unknown;
  distance?: unknown;
}

export function scoreToPercent(score: unknown): number | null {
  const n = toOptionalNumber(score);
  if (n === null) return null;
  const percent = n <= 1 ? n * 100 : n <= 100 ? n : null;
  if (percent === null) return null;
  return Math.max(0, Math.min(100, percent));
}

export function distanceToPercent(distance: unknown): number | null {
  const d = toOptionalNumber(distance);
  if (d === null) return null;
  const p = d <= 1 ? (1 - d) * 100 : (1 / (1 + d)) * 100;
  return Math.max(0, Math.min(100, p));
}

export function toPercent(input: ScoreInput): number | null {
  return (
    scoreToPercent(input.score) ??
    scoreToPercent(input.relevance) ??
    scoreToPercent(input.similarity) ??
    distanceToPercent(input.distance)
  );
}
