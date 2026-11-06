const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const buildConfig = JSON.parse(fs.readFileSync(path.join(root, 'build-config.json'), 'utf8'));
const bundleDirectory = path.resolve(root, buildConfig.bundle_directory);
const manifest = JSON.parse(fs.readFileSync(path.join(bundleDirectory, 'manifest.json'),'utf8'));

test('the model is opened natively from the app, without a cached copy', async () => {
  const filename = path.join(root,'src/features/search/infrastructure/embedders/OnnxEmbedder.ts');
  const mod = new Module(filename,module);
  const calls = [];
  let reply = Array.from({length:manifest.dim},()=>1 / Math.sqrt(manifest.dim));
  const mocks = {
    '../native/OfflineSearchNative': {OfflineSearchNative:{
      loadModel:async()=>{calls.push('load');return true;},
      embed:async text=>{calls.push(['embed',text]);return reply;},
      releaseModel:async()=>{calls.push('release');return true;},
    }},
  };
  mod.require = name => {
    if (!Object.hasOwn(mocks,name)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,filename);
  const embedder=await mod.exports.createOnnxEmbedder(manifest);
  await mod.exports.createOnnxEmbedder(manifest);
  assert.deepEqual(calls,['load'],'the model is loaded once');
  assert.ok(embedder.isReady());
  const vector=await embedder.embed('query');
  assert.ok(vector instanceof Float32Array);
  assert.deepEqual(Array.from(vector),Array.from(Float32Array.from(reply)));
  assert.deepEqual(calls[1],['embed',manifest.query_prefix+'query']);
  reply=reply.slice(1);
  await assert.rejects(embedder.embed('short vector'),/invalid embedding/);
  await mod.exports.unloadOnnxEmbedder();
  assert.equal(calls.at(-1),'release');
  assert.equal(embedder.isReady(),false);
  await assert.rejects(embedder.embed('after unload'),/not loaded/);
});
