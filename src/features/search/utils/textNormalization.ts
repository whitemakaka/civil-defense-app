/**
 * Text normalization utilities for hybrid search
 * Handles diacritics removal for Polish/English keyword matching
 */

// Polish diacritics mapping
const DIACRITICS_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
};

/**
 * Fold text: lowercase + remove diacritics + normalize whitespace
 * Used for keyword matching without Polish accents
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(char => DIACRITICS_MAP[char] ?? char)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize folded text into keywords
 * Filters out tokens shorter than minLength
 */
export function tokenize(foldedText: string, minLength = 2): string[] {
  return foldedText
    .split(/[\s\-_.,;:!?()[\]{}'"<>\/\\]+/)
    .filter(token => token.length >= minLength);
}

/**
 * Normalize and tokenize query for keyword search
 */
export function normalizeQuery(query: string, minTokenLength = 2): string[] {
  const folded = fold(query);
  return tokenize(folded, minTokenLength);
}

