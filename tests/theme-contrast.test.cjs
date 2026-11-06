const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loadTs(file) {
  const filename = path.join(root, file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(compiled, filename);
  return mod.exports;
}

const { getTheme } = loadTs('src/constants/theme.ts');

function luminance(hex) {
  const digits = hex.replace(/^#/, '').slice(0, 6);
  assert.match(digits, /^[0-9a-fA-F]{6}$/, `invalid color ${hex}`);
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const textTokens = ['textPrimary', 'textSecondary', 'textTertiary', 'muted'];
const backgroundTokens = ['background', 'surface', 'surfaceElevated', 'inputBackground'];
const pairs = [
  ...textTokens.flatMap(fg => backgroundTokens.map(bg => [fg, bg])),
  ['primaryText', 'primary'],
  ['accent', 'surface'],
  ['warning', 'background'],
  ['danger', 'background'],
  ['emergencyText', 'emergency'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'surfaceElevated'],
  ['success', 'surfaceElevated'],
];

for (const scheme of ['dark', 'light']) {
  test(`${scheme} theme defines danger tokens`, () => {
    const { colors } = getTheme(scheme);
    assert.equal(typeof colors.danger, 'string');
    assert.equal(typeof colors.dangerMuted, 'string');
    assert.equal(typeof colors.emergency, 'string');
    assert.equal(typeof colors.overlay, 'string');
  });

  test(`${scheme} theme meets WCAG 4.5:1 for required pairs`, () => {
    const { colors } = getTheme(scheme);
    const failures = pairs
      .map(([fg, bg]) => ({ fg, bg, ratio: contrast(colors[fg], colors[bg]) }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ fg, bg, ratio }) => `${fg} on ${bg}: ${ratio.toFixed(2)}`);
    assert.deepEqual(failures, []);
  });
}
