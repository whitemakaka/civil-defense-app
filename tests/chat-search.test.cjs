const test = require('node:test');
const { mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createFakeReact, loadTs } = require('./fake-react.cjs');

const root = path.resolve(__dirname, '..');
const strings = loadTs(root, 'src/constants/strings.ts');
const relevance = loadTs(root, 'src/features/search/domain/services/filterRelevant.ts');

const searchConfig = {
  local_weight: 0.6,
  global_weight: 0.4,
  top_k: 10,
  minimum_query_length: 3,
  debounce_ms: 250,
  idle_unload_seconds: 60,
  relevance_floor: 0.55,
  relevance_delta: 0.08,
};

function createStub() {
  const calls = { search: [], clearResults: 0, resetIdleTimer: 0, prewarmEmbedder: 0 };
  const state = {
    status: 'ready',
    results: [],
    resultsQuery: null,
    error: null,
    isSemanticReady: true,
    isSemanticLoading: false,
    debug: null,
  };
  const api = {
    search: async (query, options) => { calls.search.push({ query, options }); },
    clearResults: () => { calls.clearResults += 1; },
    resetIdleTimer: () => { calls.resetIdleTimer += 1; },
    prewarmEmbedder: async () => { calls.prewarmEmbedder += 1; },
    localizeResult: result => result,
  };
  const useSemanticSearch = () => ({ ...state, ...api });
  return { calls, state, useSemanticSearch };
}

function setup() {
  const fake = createFakeReact();
  const stub = createStub();
  const { useChatSearch } = loadTs(root, 'src/features/chat/hooks/useChatSearch.ts', {
    react: fake.React,
    '../../search/hooks/useSemanticSearch': { useSemanticSearch: stub.useSemanticSearch },
    '../../search/domain/services/filterRelevant': relevance,
    '../../../constants/strings': strings,
  });
  const params = { searchConfig, language: 'pl' };
  const view = { current: fake.render(useChatSearch, params) };
  const type = text => { view.current.onChangeText(text); view.current = fake.rerender(); };
  const refresh = () => { view.current = fake.rerender(); };
  return { fake, stub, view, type, refresh, useChatSearch, params };
}

const result = (id, score) => ({ id, score, content: {} });

test.beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'] }));
test.afterEach(() => mock.timers.reset());

test('3 characters + debounce triggers exactly one search with config options', () => {
  const { stub, type } = setup();
  type('prą');
  assert.equal(stub.calls.search.length, 0);
  mock.timers.tick(searchConfig.debounce_ms - 1);
  assert.equal(stub.calls.search.length, 0);
  mock.timers.tick(1);
  assert.equal(stub.calls.search.length, 1);
  assert.deepEqual(stub.calls.search[0], {
    query: 'prą',
    options: { lang: 'pl', localWeight: 0.6, globalWeight: 0.4, topK: 10 },
  });
  mock.timers.tick(searchConfig.debounce_ms * 4);
  assert.equal(stub.calls.search.length, 1);
});

test('typing more characters does not clear results and debounces to one search', () => {
  const { stub, type } = setup();
  type('prą');
  type('prąd');
  type('prądu');
  assert.equal(stub.calls.clearResults, 0);
  mock.timers.tick(searchConfig.debounce_ms);
  assert.equal(stub.calls.search.length, 1);
  assert.equal(stub.calls.search[0].query, 'prądu');
  assert.ok(stub.calls.resetIdleTimer >= 3);
});

test('query equal to resultsQuery does not search again', () => {
  const { stub, type, refresh } = setup();
  stub.state.resultsQuery = 'prąd';
  refresh();
  type('prąd ');
  mock.timers.tick(searchConfig.debounce_ms * 2);
  assert.equal(stub.calls.search.length, 0);
});

test('below minimum length clears results and cancels pending search', () => {
  const { stub, type } = setup();
  type('prą');
  type('pr');
  assert.equal(stub.calls.clearResults, 1);
  mock.timers.tick(searchConfig.debounce_ms * 2);
  assert.equal(stub.calls.search.length, 0);
});

test('takeResult returns query and result, clears input and results', () => {
  const { stub, view, type } = setup();
  type('  brak prądu ');
  const picked = result('n1', 0.7);
  const taken = view.current.takeResult(picked);
  assert.deepEqual(taken, { query: 'brak prądu', result: picked });
  assert.equal(stub.calls.clearResults, 1);
  mock.timers.tick(searchConfig.debounce_ms * 2);
  assert.equal(stub.calls.search.length, 0);
});

test('takeResult leaves an empty input after rerender', () => {
  const { view, type, fake } = setup();
  type('brak prądu');
  view.current.takeResult(result('n1', 0.7));
  view.current = fake.rerender();
  assert.equal(view.current.inputText, '');
});

test('noMatch is true when all results are below the relevance floor', () => {
  const { stub, type, refresh, view } = setup();
  type('xyzzy');
  stub.state.resultsQuery = 'xyzzy';
  stub.state.results = [result('a', 0.5), result('b', 0.4)];
  refresh();
  assert.deepEqual(view.current.results, []);
  assert.equal(view.current.noMatch, true);
});

test('results are filtered by relevance and keep order', () => {
  const { stub, type, refresh, view } = setup();
  type('prąd');
  stub.state.resultsQuery = 'prąd';
  stub.state.results = [result('a', 0.8), result('b', 0.75), result('c', 0.6)];
  refresh();
  assert.deepEqual(view.current.results.map(r => r.id), ['a', 'b']);
  assert.equal(view.current.noMatch, false);
});

test('errorText maps error codes to localized strings', () => {
  const { stub, refresh, view } = setup();
  assert.equal(view.current.errorText, null);
  stub.state.error = 'model';
  refresh();
  assert.equal(view.current.errorText, strings.STRINGS.pl.errorModel);
  stub.state.error = 'index';
  refresh();
  assert.equal(view.current.errorText, strings.STRINGS.pl.errorIndex);
});

test('isStale is false when resultsQuery is null and true when query differs', () => {
  const { stub, type, refresh, view } = setup();
  type('prąd');
  assert.equal(view.current.isStale, false);
  stub.state.resultsQuery = 'prą';
  refresh();
  assert.equal(view.current.isStale, true);
});

test('language change clears results and searches again with new language', () => {
  const { stub, type, fake, useChatSearch, params } = setup();
  type('prąd');
  fake.render(useChatSearch, { ...params, language: 'en' });
  assert.equal(stub.calls.clearResults, 1);
  assert.equal(stub.calls.search.length, 1);
  assert.equal(stub.calls.search[0].options.lang, 'en');
  mock.timers.tick(searchConfig.debounce_ms * 2);
  assert.equal(stub.calls.search.length, 1);
});

test('unmount cancels pending debounce', () => {
  const { stub, type, fake } = setup();
  type('prąd');
  fake.unmount();
  mock.timers.tick(searchConfig.debounce_ms * 2);
  assert.equal(stub.calls.search.length, 0);
});

test('onFocus resets idle timer and prewarms embedder; indexStatus derived from status', () => {
  const { stub, view, refresh } = setup();
  view.current.onFocus();
  assert.equal(stub.calls.resetIdleTimer, 1);
  assert.equal(stub.calls.prewarmEmbedder, 1);
  assert.equal(view.current.indexStatus, 'ready');
  stub.state.isSemanticLoading = true;
  refresh();
  assert.equal(view.current.indexStatus, 'loading');
  stub.state.status = 'searching';
  refresh();
  assert.equal(view.current.indexStatus, 'searching');
  assert.equal(view.current.isSearching, true);
});
