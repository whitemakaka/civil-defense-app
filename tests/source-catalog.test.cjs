const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const buildConfig = JSON.parse(fs.readFileSync(path.join(root, 'build-config.json'), 'utf8'));
const bundleDirectory = path.resolve(root, buildConfig.bundle_directory);
const bundle = bundleDirectory;
const sourceGroups = require('../src/config/sourceGroups.json');
const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json'), 'utf8'));
const notes = fs.readFileSync(path.join(bundle, manifest.notes_file), 'utf8')
  .trim().split('\n').map(JSON.parse);

function loadTs(file, mocks) {
  const filename = path.join(root, file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  const localRequire = Module.createRequire(filename);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name);
  mod._compile(compiled, filename);
  return mod.exports;
}

const loader = loadTs('src/features/search/infrastructure/loaders/BundleLoader.ts', {
  'react-native-fs': {
    readFileAssets: async asset => fs.readFileSync(
      path.join(bundle, asset.replace(/^offline_bundle\//, '')), 'utf8',
    ),
  },
});

const native = {
  StyleSheet: { create: value => value },
  View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
};
const createElement = (type, props, ...children) => ({ type, props, children });
const theme = { colors: {} };

test('welcome and information catalog loads all publications without an error', async () => {
  const entries = await loader.loadSourceCatalog();
  const { SourceCatalog, buildSourceItems } = loadTs('src/components/SourceCatalog.tsx', {
    react: { createElement, useMemo: factory => factory() },
    'react-native': native,
    '../constants/strings': loadTs('src/constants/strings.ts', {}),
    '../stores/bundle/bundleStore': {
      useBundle: () => ({ status: 'ready', manifest, sourceCatalog: entries }),
    },
  });
  const items = buildSourceItems(entries);
  const rendered = SourceCatalog({ language: manifest.languages[0], theme });
  assert.equal(rendered.children.flat().filter(child => child && child.type === 'Text').length,
    items.length + 1);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  for (const language of manifest.languages) {
    assert.ok(items.every(item => item.label[language].trim()));
    const guideGroup = sourceGroups.find(group => group.detailByCountry);
    const guides = guideGroup.sourceIds.map(id => entries.find(entry => entry.id === id))
      .filter(entry => !entry.content[language].url);
    assert.deepEqual(items.slice(0, guides.length).map(item => item.label[language]),
      guides.map(entry => `${entry.content[language].title} (${entry.content[language].country})`));
    const institutions = sourceGroups.filter(group => !group.detailByCountry && group.showInIntro !== false);
    assert.deepEqual(items.slice(guides.length).map(item => item.label[language]),
      institutions.map(group => group.label[language]));
  }
});

test('every publication has exactly one configured publisher in both languages', async () => {
  const entries = await loader.loadSourceCatalog();
  const available = new Set(entries.map(entry => entry.id));
  assert.equal(new Set(sourceGroups.map(group => group.id)).size, sourceGroups.length);
  for (const group of sourceGroups) {
    for (const language of manifest.languages) assert.ok(group.label[language].trim());
    for (const sourceId of group.sourceIds) assert.ok(available.has(sourceId), sourceId);
  }
  for (const entry of entries) {
    assert.equal(sourceGroups.filter(group => group.sourceIds.includes(entry.id)).length, 1,
      `Missing or duplicated publisher for ${entry.id}`);
  }
});

test('sources expand under every note without throwing in either language', () => {
  const { ChatMessageBubble } = loadTs('src/features/chat/components/ChatMessageBubble.tsx', {
    react: { createElement, useState: () => [true, () => {}] },
    'react-native': native,
    'expo-clipboard': { setStringAsync: async () => {} },
    '@expo/vector-icons': { MaterialCommunityIcons: () => null },
    '../../../constants/theme': loadTs('src/constants/theme.ts', {}),
    '../../../constants/strings': loadTs('src/constants/strings.ts', {}),
  });
  for (const note of notes) for (const language of manifest.languages) {
    const content = note.content[language];
    assert.doesNotThrow(() => ChatMessageBubble({
      message: {
        id: note.id,
        role: 'assistant',
        text: content.note.join('\n'),
        result: { ...content, lang: language },
      },
      bubbleMaxWidth: '100%', theme,
    }), `${note.id}/${language}`);
  }
});
