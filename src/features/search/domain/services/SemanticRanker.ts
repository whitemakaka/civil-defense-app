import type { NoteMeta, RecordMeta, SearchLanguage, SearchResult } from '../../types';

interface RankingInput {
  records: RecordMeta[];
  notes: Map<string, NoteMeta>;
  candidates: number[];
  vectorScores: Map<number, number>;
  localWeight: number;
  globalWeight: number;
  topK: number;
}

interface NoteMatch {
  noteId: string;
  lang: SearchLanguage;
  local: { score: number; lineIndex: number } | null;
  global: number | null;
}

export function rankSemantic(input: RankingInput): SearchResult[] {
  const { localWeight, globalWeight } = input;
  if (![localWeight, globalWeight].every(value => Number.isFinite(value) && value > 0) ||
      !Number.isInteger(input.topK) || input.topK <= 0) {
    throw new Error('Invalid ranking configuration');
  }
  const grouped = new Map<string, NoteMatch>();

  // Group before sorting/topK: one result per note, regardless of scope or line count.
  for (const index of input.candidates) {
    const record = input.records[index];
    const score = input.vectorScores.get(index);
    if (!record || score === undefined || !Number.isFinite(score)) {
      throw new Error(`Missing semantic score or record for embedding ${index}`);
    }
    let match = grouped.get(record.note_id);
    if (!match) {
      match = { noteId: record.note_id, lang: record.lang, local: null, global: null };
      grouped.set(record.note_id, match);
    }
    if (match.lang !== record.lang) throw new Error('Ranking candidates contain mixed languages');
    if (record.embedding_scope === 'local') {
      if (record.line_index === null) throw new Error(`Missing local line for ${record.id}`);
      if (match.local === null || score > match.local.score) {
        match.local = { score, lineIndex: record.line_index };
      }
    } else if (record.embedding_scope === 'global') {
      if (match.global !== null) throw new Error(`Duplicate global vector for ${record.note_id}`);
      match.global = score;
    } else {
      throw new Error(`Unknown embedding scope for ${record.id}`);
    }
  }

  const results = [...grouped.values()].map((match): SearchResult => {
    if (match.local === null || match.global === null) {
      throw new Error(`Incomplete local/global scores for ${match.noteId}`);
    }
    const note = input.notes.get(match.noteId);
    if (!note) throw new Error(`Missing note ${match.noteId}`);
    const content = note.content[match.lang];
    if (!content) throw new Error(`Missing note language ${match.noteId}/${match.lang}`);
    const vectorScore = (localWeight * match.local.score + globalWeight * match.global) /
      (localWeight + globalWeight);
    return {
      ...note,
      ...content,
      lang: match.lang,
      matchedLineIndex: match.local.lineIndex,
      score: vectorScore,
      vectorScore,
      localVectorScore: match.local.score,
      globalVectorScore: match.global,
    };
  });
  return results.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, input.topK);
}
