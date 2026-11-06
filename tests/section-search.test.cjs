const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const buildConfig = JSON.parse(fs.readFileSync(path.join(root, 'build-config.json'), 'utf8'));
const bundleDirectory = path.resolve(root, buildConfig.bundle_directory);
const bundlePath = bundleDirectory;
const manifest = JSON.parse(fs.readFileSync(path.join(bundlePath, 'manifest.json'), 'utf8'));
const jsonl = name => fs.readFileSync(path.join(bundlePath, name), 'utf8').trim().split('\n').map(JSON.parse);
const records = jsonl(manifest.records_file);
const notes = new Map(jsonl(manifest.notes_file).map(note => [note.id, note]));

function loadTs(file, mocks = {}) {
  const filename = path.join(root, file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  const localRequire = Module.createRequire(filename);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name);
  mod._compile(compiled, filename);
  return mod.exports;
}
const { rankSemantic } = loadTs('src/features/search/domain/services/SemanticRanker.ts');
const options = {
  localWeight: manifest.search.local_weight, globalWeight: manifest.search.global_weight,
  topK: manifest.search.top_k,
};
function rank(selected, extra = {}) {
  return rankSemantic({ records, notes, candidates: selected.map(r => r.embedding_idx),
    vectorScores: new Map(selected.map(r => [r.embedding_idx, 0.5])),
    ...options, ...extra });
}
function loadBundleWithTransform(transform = (file, value) => value) {
  return loadTs('src/features/search/infrastructure/loaders/BundleLoader.ts', {
    'react-native-fs': { readFileAssets: async asset => {
      const file = asset.replace(/^offline_bundle\//, '');
      return transform(file, fs.readFileSync(path.join(bundlePath, file), 'utf8'));
    } },
  }).loadBundle();
}

test('complete local and global vectors resolve to exactly one full note per language', async () => {
  const bundle = await loadBundleWithTransform();
  for (const lang of manifest.languages) {
    const selected = records.filter(r => r.lang === lang);
    const results = rank(selected, {topK: notes.size});
    assert.equal(results.length, notes.size);
    assert.equal(new Set(results.map(r => r.id)).size, notes.size);
    for (const result of results) {
      assert.deepEqual(result.note, notes.get(result.id).content[lang].note);
      assert.equal(records[result.global_embedding_idx].embedding_scope, 'global');
      assert.equal(records[result.global_embedding_idx].note_id, result.id);
      assert.ok(result.matchedLineIndex >= 0 && result.matchedLineIndex < result.note.length);
    }
  }
  assert.equal(bundle.records.length, manifest.local_vector_count + manifest.global_vector_count);
});

test('global and local evidence both affect ranking, with no requirement to match both strongly', () => {
  const ids = [...notes.keys()].slice(0, 2);
  const selected = records.filter(r => r.lang === 'pl' && ids.includes(r.note_id));
  const scores = new Map(selected.map(r => [r.embedding_idx,
    r.note_id === ids[0] ? (r.embedding_scope === 'local' ? 1 : 0) :
      (r.embedding_scope === 'global' ? 1 : 0)]));
  assert.equal(rank(selected, {vectorScores: scores, localWeight: 0.8, globalWeight: 0.2})[0].id, ids[0]);
  assert.equal(rank(selected, {vectorScores: scores, localWeight: 0.2, globalWeight: 0.8})[0].id, ids[1]);
  assert.equal(rank(selected, {vectorScores: scores, topK: 1}).length, 1);
});

test('best local fragment supplies preview, global evidence does not duplicate or replace the note', () => {
  const selected = records.filter(r => r.lang === 'pl' && r.note_id === 'gunfire-explosion');
  const winner = selected.filter(r => r.embedding_scope === 'local').at(-1);
  const scores = new Map(selected.map(r => [r.embedding_idx, r === winner ? 0.9 : 0.4]));
  const [result] = rank(selected, {vectorScores: scores});
  assert.equal(result.matchedLineIndex, winner.line_index);
  assert.equal(result.localVectorScore, 0.9);
  assert.equal(result.globalVectorScore, 0.4);
  assert.deepEqual(result.note, notes.get(winner.note_id).content.pl.note);
});

test('missing global vector or score is an error, never a local-only substitute', () => {
  const selected = records.filter(r => r.lang === 'pl' && r.note_id === 'gunfire-explosion');
  assert.throws(() => rank(selected.filter(r => r.embedding_scope === 'local')), /Incomplete local\/global/);
  assert.throws(() => rank(selected, {vectorScores: new Map()}), /Missing semantic score/);
});

test('bundle rejects incorrect global links and duplicate local mappings', async () => {
  await assert.rejects(loadBundleWithTransform((file, text) => {
    if (file !== manifest.notes_file) return text;
    const rows = text.trim().split('\n').map(JSON.parse);
    rows[0].content.pl.global_embedding_idx = -1;
    return rows.map(JSON.stringify).join('\n');
  }), /Invalid global embedding/);
  await assert.rejects(loadBundleWithTransform((file, text) => {
    if (file !== manifest.records_file) return text;
    const rows = text.trim().split('\n').map(JSON.parse);
    rows[1] = {...rows[0], embedding_idx: rows[1].embedding_idx};
    return rows.map(JSON.stringify).join('\n');
  }), /Invalid local embedding/);
});

test('one query embedding scores both scopes', async () => {
  let embeds = 0;
  let scored = [];
  const {executeSearch} = loadTs('src/features/search/hooks/executeSearch.ts', {
    '../domain/services/SemanticRanker': {rankSemantic},
    '../infrastructure/embedders': {
      getEmbedder: async () => ({embed: async () => { embeds++; return new Float32Array(manifest.dim); }, isReady: () => true}),
      getEmbedderType: () => 'onnx',
    },
    '../infrastructure/native/OfflineSearchNative': {OfflineSearchNative: {
      warmup: async () => true,
      scoreCandidates: async (_query, candidates) => { scored = candidates; return candidates.map(() => 0.5); },
    }},
  });
  const result = await executeSearch('where should I hide', {records, notes, manifest, dim:manifest.dim},
    {...options, lang:'en'});
  assert.equal(embeds, 1);
  assert.equal(scored.length, records.filter(r => r.lang === 'en').length);
  assert.deepEqual(new Set(scored.map(i => records[i].embedding_scope)), new Set(['local','global']));
  assert.equal(new Set(result.results.map(r => r.id)).size, result.results.length);
});

test('older asynchronous search cannot overwrite newer results or repopulate cleared results', async () => {
  const state = {bundleRef:{current:{}}, loadPromiseRef:{current:null}, searchRequestRef:{current:null}};
  for (const field of ['Status','Error','RecordCount','Results','Debug','ResultsQuery','EmbedderType','IsSemanticReady','IsSemanticLoading']) {
    state['set'+field] = value => { state[field] = value; };
  }
  state.clearResults = () => {state.searchRequestRef.current=null;state.Results=[];};
  const pending = new Map();
  const {useSemanticSearch} = loadTs('src/features/search/hooks/useSemanticSearch.ts', {
    react:{useCallback:fn=>fn,useEffect:()=>{}},
    '../infrastructure/loaders/BundleLoader':{}, '../infrastructure/embedders':{},
    './useSearchState':{useSearchState:()=>state},
    './useIdleUnload':{useIdleUnload:()=>({touch:()=>{},reset:()=>{},clear:()=>{}})},
    './executeSearch':{executeSearch:query=>new Promise(resolve=>pending.set(query,resolve))},
  });
  const api = useSemanticSearch({autoLoad:false,autoWarmEmbedder:false,idleUnloadTimeout:'off',idleUnloadMode:'all'});
  const result = id => ({results:[{id}],debug:{},embedderType:'onnx',isSemanticReady:true});
  const old = api.search('old', options);
  const current = api.search('current', options);
  pending.get('current')(result('current')); await current;
  pending.get('old')(result('old')); await old;
  assert.equal(state.Results[0].id,'current');
  const cleared = api.search('cleared', options);
  api.clearResults();
  pending.get('cleared')(result('cleared')); await cleared;
  assert.deepEqual(state.Results,[]);
});

test('language switching keeps one full note even without a loaded index', () => {
  const {useSemanticSearch} = loadTs('src/features/search/hooks/useSemanticSearch.ts', {
    react:{useCallback:fn=>fn,useEffect:()=>{}},
    '../infrastructure/loaders/BundleLoader':{}, '../infrastructure/embedders':{},
    './useSearchState':{useSearchState:()=>({bundleRef:{current:null}})},
    './useIdleUnload':{useIdleUnload:()=>({})}, './executeSearch':{},
  });
  const api=useSemanticSearch({autoLoad:false,autoWarmEmbedder:false,idleUnloadTimeout:'off',idleUnloadMode:'all'});
  const [result]=rank(records.filter(r=>r.lang==='pl' && r.note_id==='gunfire-explosion'));
  const en=api.localizeResult(result,'en');
  assert.equal(en.id,result.id);
  assert.deepEqual(en.note,result.content.en.note);
  assert.equal(en.global_embedding_idx,result.content.en.global_embedding_idx);
});
