/**
 * Display-only text normalization.
 * Keeps search/index logic unchanged.
 */

export function formatQuoteText(input: string): string {
  if (!input) return '';

  // Normalize common "checkbox list" glyphs from PDF extraction.
  // Convert to modern bullets and normalize whitespace.
  const lines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/^\s*[□☐]\s*/u, '• ').replace(/\s+$/g, ''));

  // Collapse multiple blank lines (keep max 1 empty line).
  const out: string[] = [];
  for (const line of lines) {
    const isEmpty = line.trim().length === 0;
    if (isEmpty) {
      if (out.length === 0) continue;
      if (out[out.length - 1] === '') continue;
      out.push('');
      continue;
    }
    out.push(line);
  }

  return out.join('\n').trim();
}

/**
 * Humanize metadata values for display.
 * Example: "Zadbaj_o_zwierzeta" -> "Zadbaj o zwierzeta"
 */
export function formatMetaValue(input: string): string {
  if (!input) return '';
  const s = String(input)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

