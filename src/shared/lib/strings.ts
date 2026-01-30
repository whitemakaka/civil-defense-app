/**
 * String utility functions
 * Generic helpers for string manipulation
 */

export function firstNonEmpty(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v;
    }
  }
  return '';
}

export function formatSlugTitle(slug: string): string {
  const s = slug.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function looksLikeTechnicalId(value: string): boolean {
  return value.includes('_') && !value.includes(' ');
}

export function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
