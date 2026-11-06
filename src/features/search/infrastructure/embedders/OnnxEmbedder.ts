import type { Manifest } from '../../types';
import { OfflineSearchNative } from '../native/OfflineSearchNative';

// The model runs in the native module, read straight from the installed app,
// so the device keeps a single copy of it.
let loading: Promise<void> | null = null;
let activeManifest: Manifest | null = null;

export interface OnnxEmbedder {
  embed(text: string): Promise<Float32Array>;
  getDim(): number;
  isReady(): boolean;
}

export async function createOnnxEmbedder(manifest: Manifest): Promise<OnnxEmbedder> {
  await loadModel(manifest);
  return {
    embed: embedText,
    getDim: () => manifest.dim,
    isReady: () => activeManifest !== null,
  };
}

async function loadModel(manifest: Manifest): Promise<void> {
  if (activeManifest !== null) {
    if (activeManifest.bundle_id !== manifest.bundle_id) {
      throw new Error('A different semantic bundle is already loaded');
    }
    return;
  }
  if (loading !== null) {
    await loading;
    return;
  }

  loading = (async () => {
    await OfflineSearchNative.loadModel();
    activeManifest = manifest;
  })();

  try {
    await loading;
  } finally {
    loading = null;
  }
}

async function embedText(text: string): Promise<Float32Array> {
  const manifest = activeManifest;
  if (manifest === null) {
    throw new Error('Semantic model is not loaded');
  }
  const values = await OfflineSearchNative.embed(manifest.query_prefix + text);
  if (values.length !== manifest.dim || !values.every(Number.isFinite)) {
    throw new Error('ONNX model returned an invalid embedding');
  }
  return Float32Array.from(values);
}

export async function unloadOnnxEmbedder(): Promise<void> {
  if (loading !== null) {
    await loading.catch(() => {});
  }
  activeManifest = null;
  await OfflineSearchNative.releaseModel();
}
