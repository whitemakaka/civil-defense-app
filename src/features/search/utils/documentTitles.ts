/**
 * Document title resolution
 * Maps technical document IDs to human-readable titles
 */

type Lang = 'pl' | 'en';

interface TitleEntry {
  pl: string;
  en: string;
}

const DOCUMENT_TITLES: Record<string, TitleEntry> = {
  poradnik_bezpieczenstwa: {
    pl: 'Poradnik Bezpieczeństwa',
    en: 'Safety Handbook',
  },
  badz_gotowy: {
    pl: 'Bądź gotowy – poradnik na czas kryzysu i wojny',
    en: 'Get Ready',
  },
};

export function resolveDocTitle(docId: string, lang: Lang | string): string {
  const key = docId.toLowerCase().replace(/_(pl|en)$/, '');
  const entry = DOCUMENT_TITLES[key];
  
  if (!entry) return docId;
  
  return lang.toLowerCase() === 'en' ? entry.en : entry.pl;
}

export function isKnownDocument(docId: string): boolean {
  const key = docId.toLowerCase().replace(/_(pl|en)$/, '');
  return key in DOCUMENT_TITLES;
}
