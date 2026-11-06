import type {
  Manifest,
  NoteMeta,
  NoteSource,
  RecordMeta,
  SearchLanguage,
} from '../../types';

const BUNDLE_ROOT = 'offline_bundle';
const MANIFEST_PATH = `${BUNDLE_ROOT}/manifest.json`;

export interface LoadedBundle {
  records: RecordMeta[];
  notes: Map<string, NoteMeta>;
  dim: number;
  manifest: Manifest;
}

function getFileSystem() {
  return require('react-native-fs');
}

export async function loadManifest(): Promise<Manifest> {
  const raw = await getFileSystem().readFileAssets(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  const config = manifest.search;
  if (!config ||
      !Number.isFinite(config.local_weight) || config.local_weight <= 0 ||
      !Number.isFinite(config.global_weight) || config.global_weight <= 0 ||
      !Number.isInteger(config.top_k) || config.top_k <= 0 ||
      !Number.isInteger(manifest.max_length) || manifest.max_length < 2 ||
      typeof manifest.embedding_text_separator !== 'string' || !manifest.embedding_text_separator.length) {
    throw new Error('Invalid local/global search configuration');
  }
  for (const field of ['relevance_floor', 'relevance_delta'] as const) {
    const value = config[field];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) {
      throw new Error(`Invalid search configuration: ${field}`);
    }
  }
  return manifest;
}

export interface SourceCatalogEntry {
  id: string;
  content: Record<SearchLanguage, NoteSource>;
}

export async function loadSourceCatalog(manifest?: Manifest): Promise<SourceCatalogEntry[]> {
  manifest ??= await loadManifest();
  const raw = await getFileSystem().readFileAssets(`${BUNDLE_ROOT}/${manifest.notes_file}`, 'utf8');
  const catalog = new Map<string, SourceCatalogEntry>();
  for (const line of (raw as string).split('\n').filter(Boolean)) {
    const note = JSON.parse(line) as NoteMeta;
    const polish = note.content.pl.sources;
    const english = note.content.en.sources;
    if (polish.length !== english.length) throw new Error(`Source languages differ for ${note.id}`);
    for (let index = 0; index < polish.length; index++) {
      const pl = polish[index];
      const en = english[index];
      if (pl.source !== en.source) throw new Error(`Source order differs for ${note.id}`);
      const entry = { id: pl.source, content: { pl, en } };
      const previous = catalog.get(entry.id);
      if (previous && JSON.stringify(previous.content) !== JSON.stringify(entry.content)) {
        // Page references vary by note; only the publication identity must agree.
        for (const language of manifest.languages) {
          const oldSource = previous.content[language];
          const newSource = entry.content[language];
          if (oldSource.title !== newSource.title || oldSource.country !== newSource.country || oldSource.url !== newSource.url) {
            throw new Error(`Source metadata differs for ${entry.id}`);
          }
        }
      }
      if (!previous) catalog.set(entry.id, entry);
    }
  }
  return [...catalog.values()];
}

export async function loadBundle(): Promise<LoadedBundle> {
  const manifest = await loadManifest();
  const recordsRaw = await getFileSystem().readFileAssets(
    `${BUNDLE_ROOT}/${manifest.records_file}`,
    'utf8',
  );
  const records = recordsRaw
    .split('\n')
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as RecordMeta);

  const notesRaw = await getFileSystem().readFileAssets(`${BUNDLE_ROOT}/${manifest.notes_file}`, 'utf8');
  const notes = new Map<string, NoteMeta>();
  for (const line of (notesRaw as string).split('\n').filter(Boolean)) {
    const note = JSON.parse(line) as NoteMeta;
    if (notes.has(note.id)) throw new Error(`Duplicate note ${note.id}`);
    for (const language of manifest.languages) {
      if (!note.content[language]?.note?.length || !note.content[language]?.topic ||
          !note.content[language]?.sources?.length) {
        throw new Error(`Missing note content ${note.id}/${language}`);
      }
    }
    notes.set(note.id, note);
  }
  if (notes.size !== manifest.note_count || records.length !== manifest.count) {
    throw new Error('Bundle note/record counts do not match the manifest');
  }
  const globalKeys = new Set<string>();
  const localKeys = new Set<string>();
  for (const [index, record] of (records as RecordMeta[]).entries()) {
    const note = notes.get(record.note_id);
    const content = note?.content[record.lang];
    if (record.embedding_idx !== index || !manifest.languages.includes(record.lang) || !content ||
        content.topic !== record.topic ||
        content.subtopic !== record.subtopic) {
      throw new Error(`Invalid note mapping for ${record.id}`);
    }
    const key = JSON.stringify([record.note_id, record.lang]);
    if (record.embedding_scope === 'global') {
      if (record.line_index !== null || content.global_embedding_idx !== index || globalKeys.has(key) ||
          record.text !== content.note.join(manifest.embedding_text_separator)) {
        throw new Error(`Invalid global embedding for ${record.id}`);
      }
      globalKeys.add(key);
    } else if (record.embedding_scope === 'local') {
      const localKey = JSON.stringify([record.note_id, record.lang, record.line_index]);
      if (record.line_index === null || !Number.isInteger(record.line_index) ||
          record.line_index < 0 || record.line_index >= content.note.length ||
          content.note[record.line_index] !== record.text || localKeys.has(localKey)) {
        throw new Error(`Invalid local embedding for ${record.id}`);
      }
      localKeys.add(localKey);
    } else {
      throw new Error(`Unknown embedding scope for ${record.id}`);
    }
  }
  const expectedLocals = [...notes.values()].reduce((count, note) => count +
    manifest.languages.reduce((sum, language) => sum + note.content[language].note.length, 0), 0);
  if (globalKeys.size !== notes.size * manifest.languages.length ||
      globalKeys.size !== manifest.global_vector_count ||
      localKeys.size !== expectedLocals || localKeys.size !== manifest.local_vector_count) {
    throw new Error('Incomplete local/global embeddings');
  }

  return {
    records,
    notes,
    dim: manifest.dim,
    manifest,
  };
}
