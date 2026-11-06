const test = require('node:test');
const { mock } = test;
const assert = require('node:assert/strict');
const path = require('node:path');
const { createFakeReact, loadTs } = require('./fake-react.cjs');

const root = path.resolve(__dirname, '..');
const IDLE_FILE = 'src/features/search/hooks/useIdleUnload.ts';

test('idle timer survives re-renders with new callback literals and fires once', t => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.after(() => mock.timers.reset());

  const { React, render, rerender, unmount } = createFakeReact();
  const { useIdleUnload } = loadTs(root, IDLE_FILE, { react: React });
  let embedderUnloads = 0;
  let bundleUnloads = 0;
  const hook = () => useIdleUnload(30, 'embedder', {
    onUnloadBundle: () => { bundleUnloads++; },
    onUnloadEmbedder: () => { embedderUnloads++; },
  });

  const first = render(hook);
  first.reset();
  const second = rerender();
  assert.equal(second, first, 'returned object is identity-stable');
  rerender();

  mock.timers.tick(29_999);
  assert.equal(embedderUnloads, 0);
  mock.timers.tick(1);
  assert.equal(embedderUnloads, 1);
  assert.equal(bundleUnloads, 0);
  mock.timers.tick(120_000);
  assert.equal(embedderUnloads, 1, 'fires exactly once');

  // touch() postpones the unload; unmount() cancels the pending timer.
  second.reset();
  mock.timers.tick(20_000);
  second.touch();
  mock.timers.tick(20_000);
  assert.equal(embedderUnloads, 1, 'touch postponed the unload');
  unmount();
  mock.timers.tick(120_000);
  assert.equal(embedderUnloads, 1, 'unmount cleared the timer');
});

test('useSemanticSearch keeps search and resetIdleTimer identity across renders', () => {
  const { React, render, rerender, unmount } = createFakeReact();
  const noop = () => {};
  const state = {
    status: 'idle', error: null, results: [], debug: null,
    isSemanticReady: false, isSemanticLoading: false, resultsQuery: null,
    bundleRef: { current: null }, loadPromiseRef: { current: null }, searchRequestRef: { current: null },
    setStatus: noop, setError: noop, setResults: noop, setDebug: noop, setResultsQuery: noop,
    setIsSemanticReady: noop, setIsSemanticLoading: noop,
    clearResults: noop, resetBundle: noop, resetEmbedderState: noop,
  };
  const idleModule = loadTs(root, IDLE_FILE, { react: React });
  const { useSemanticSearch } = loadTs(root, 'src/features/search/hooks/useSemanticSearch.ts', {
    react: React,
    './useSearchState': { useSearchState: () => state },
    './executeSearch': { executeSearch: async () => ({ results: [], debug: null, isSemanticReady: false }) },
    '../infrastructure/loaders/BundleLoader': { loadBundle: async () => ({}) },
    '../infrastructure/embedders': { getEmbedder: async () => ({}), getEmbedderType: () => 'onnx', resetEmbedder: async () => {} },
    './useIdleUnload': idleModule,
  });
  const hook = () => useSemanticSearch({
    autoLoad: false, autoWarmEmbedder: false, idleUnloadTimeout: 30, idleUnloadMode: 'all',
  });

  const first = render(hook);
  const second = rerender();
  assert.equal(second.search, first.search);
  assert.equal(second.resetIdleTimer, first.resetIdleTimer);
  unmount();
});
