const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

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

const { STRINGS, formatPointCount } = loadTs('src/constants/strings.ts');

test('formatPointCount uses Polish plural forms', () => {
  assert.equal(formatPointCount(1, 'pl'), '1 punkt');
  assert.equal(formatPointCount(2, 'pl'), '2 punkty');
  assert.equal(formatPointCount(5, 'pl'), '5 punktów');
  assert.equal(formatPointCount(12, 'pl'), '12 punktów');
  assert.equal(formatPointCount(22, 'pl'), '22 punkty');
  assert.equal(formatPointCount(25, 'pl'), '25 punktów');
});

test('formatPointCount uses English plural forms', () => {
  assert.equal(formatPointCount(1, 'en'), '1 point');
  assert.equal(formatPointCount(2, 'en'), '2 points');
});

function assertNonEmptyStrings(value, where) {
  for (const [key, entry] of Object.entries(value)) {
    const at = `${where}.${key}`;
    if (entry !== null && typeof entry === 'object') {
      assert.ok(Object.keys(entry).length > 0, `${at} is empty`);
      assertNonEmptyStrings(entry, at);
    } else {
      assert.equal(typeof entry, 'string', `${at} is not a string`);
      assert.ok(entry.trim().length > 0, `${at} is empty`);
    }
  }
}

test('every string is non-empty in both languages with matching keys', () => {
  assert.deepEqual(Object.keys(STRINGS).sort(), ['en', 'pl']);
  for (const lang of ['pl', 'en']) assertNonEmptyStrings(STRINGS[lang], lang);
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.pl).sort());
  assert.deepEqual(Object.keys(STRINGS.en.a11yStatus).sort(), Object.keys(STRINGS.pl.a11yStatus).sort());
  assert.deepEqual(Object.keys(STRINGS.pl.a11yStatus).sort(),
    ['error', 'idle', 'loading', 'ready', 'searching']);
});

test('formatResultCount uses Polish and English plural forms', () => {
  const { formatResultCount } = loadTs('src/constants/strings.ts');
  assert.equal(formatResultCount(1, 'pl'), '1 wynik');
  assert.equal(formatResultCount(3, 'pl'), '3 wyniki');
  assert.equal(formatResultCount(5, 'pl'), '5 wyników');
  assert.equal(formatResultCount(13, 'pl'), '13 wyników');
  assert.equal(formatResultCount(1, 'en'), '1 result');
  assert.equal(formatResultCount(4, 'en'), '4 results');
});
