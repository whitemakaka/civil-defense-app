/**
 * Bundle loader
 * Loads offline search bundle from Android assets (no web support)
 */

import type { Manifest, KeywordIndex, RecordMeta } from '../../types';

export interface LoadedBundle {
  records: RecordMeta[];
  dim: number;
  keywordIndex: KeywordIndex;
  manifest: Manifest;
}

export async function loadBundle(): Promise<LoadedBundle> {
  const manifest = await loadManifest();
  const keywordIndex = await loadKeywordIndex(manifest);
  const records = await loadRecords(manifest);

  return {
    records,
    dim: manifest.dim,
    keywordIndex,
    manifest,
  };
}

async function loadManifest(): Promise<Manifest> {
  const RNFS = require('react-native-fs');
  const raw = await RNFS.readFileAssets('offline_bundle/manifest.json', 'utf8');
  return JSON.parse(raw) as Manifest;
}

async function loadKeywordIndex(manifest: Manifest): Promise<KeywordIndex> {
  const RNFS = require('react-native-fs');
  const file = manifest.keyword_index_file ?? 'keyword_index.json';
  const raw = await RNFS.readFileAssets(`offline_bundle/${file}`, 'utf8');
  return JSON.parse(raw) as KeywordIndex;
}

async function loadRecords(manifest: Manifest): Promise<RecordMeta[]> {
  const RNFS = require('react-native-fs');
  const recordsFile = manifest.records_file ?? 'records_meta.jsonl';
  const raw = await RNFS.readFileAssets(`offline_bundle/${recordsFile}`, 'utf8');
  return raw
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)
    .map((line: string) => JSON.parse(line) as RecordMeta);
}
