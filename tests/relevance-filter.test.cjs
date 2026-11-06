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

const { filterRelevant, getRelevanceConfig, DEFAULT_RELEVANCE } =
  loadTs('src/features/search/domain/services/filterRelevant.ts');
const config = { floor: 0.5, delta: 0.1 };
const results = (...scores) => scores.map((score, index) => ({ id: `n${index}`, score }));
const ids = list => list.map(r => r.id);

function loaderWithManifest(transform) {
  return loadTs('src/features/search/infrastructure/loaders/BundleLoader.ts', {
    'react-native-fs': { readFileAssets: async asset => {
      const file = asset.replace(/^offline_bundle\//, '');
      const text = fs.readFileSync(path.join(bundlePath, file), 'utf8');
      return file === 'manifest.json' ? JSON.stringify(transform(JSON.parse(text))) : text;
    } },
  });
}

test('empty results stay empty', () => {
  assert.deepEqual(filterRelevant([], config), []);
});

test('top result below the floor yields no results', () => {
  assert.deepEqual(filterRelevant(results(0.49, 0.45), config), []);
});

test('delta cuts the tail and the floor still applies', () => {
  assert.deepEqual(ids(filterRelevant(results(0.9, 0.85, 0.8, 0.79, 0.6), config)), ['n0', 'n1', 'n2']);
  assert.deepEqual(ids(filterRelevant(results(0.55, 0.5, 0.49), config)), ['n0', 'n1']);
});

test('input order is preserved', () => {
  assert.deepEqual(ids(filterRelevant(results(0.7, 0.9, 0.3, 0.85), config)), ['n1', 'n3']);
});

test('relevance config falls back to defaults and reads manifest fields', () => {
  const base = { local_weight: 0.5, global_weight: 0.5, top_k: 5, minimum_query_length: 3,
    debounce_ms: 300, idle_unload_seconds: 60 };
  assert.deepEqual(DEFAULT_RELEVANCE, { floor: 0.69, delta: 0.02 });
  assert.deepEqual(getRelevanceConfig(base), DEFAULT_RELEVANCE);
  assert.deepEqual(getRelevanceConfig({ ...base, relevance_floor: 0.4, relevance_delta: 0.2 }),
    { floor: 0.4, delta: 0.2 });
  assert.deepEqual(getRelevanceConfig({ ...base, relevance_floor: 0 }), { floor: 0, delta: 0.02 });
});

test('loadManifest validates relevance fields only when present', async () => {
  const without = m => {
    const search = { ...m.search };
    delete search.relevance_floor;
    delete search.relevance_delta;
    return { ...m, search };
  };
  const manifest = await loaderWithManifest(without).loadManifest();
  assert.equal(manifest.search.relevance_floor, undefined);
  const withFields = m => ({ ...m, search: { ...m.search, relevance_floor: 0.6, relevance_delta: 0.1 } });
  assert.equal((await loaderWithManifest(withFields).loadManifest()).search.relevance_floor, 0.6);
  for (const bad of [{ relevance_floor: 2 }, { relevance_delta: -0.1 }, { relevance_floor: '0.5' }]) {
    await assert.rejects(loaderWithManifest(m => ({ ...m, search: { ...m.search, ...bad } })).loadManifest(),
      /Invalid search configuration/);
  }
});

test('loadSourceCatalog accepts a preloaded manifest and reads it otherwise', async () => {
  let manifestReads = 0;
  const loader = loaderWithManifest(m => { manifestReads++; return m; });
  const fromDisk = await loader.loadSourceCatalog();
  assert.equal(manifestReads, 1);
  const manifest = await loader.loadManifest();
  const fromArg = await loader.loadSourceCatalog(manifest);
  assert.equal(manifestReads, 2);
  assert.deepEqual(fromArg, fromDisk);
  assert.ok(fromArg.length > 0);
});
