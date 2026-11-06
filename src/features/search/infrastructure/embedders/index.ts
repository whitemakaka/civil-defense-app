import type { Manifest } from '../../types';
import { createOnnxEmbedder, unloadOnnxEmbedder } from './OnnxEmbedder';

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
  getDim(): number;
  isReady(): boolean;
  type: 'onnx';
}

let embedder: Embedder | null = null;
let initialization: Promise<Embedder> | null = null;
let bundleId: string | null = null;

export async function getEmbedder(manifest: Manifest): Promise<Embedder> {
  if (embedder !== null) {
    if (bundleId !== manifest.bundle_id) {
      throw new Error('A different semantic bundle is already initialized');
    }
    return embedder;
  }
  if (initialization !== null) {
    return initialization;
  }

  initialization = (async () => {
    const onnx = await createOnnxEmbedder(manifest);
    if (onnx.getDim() !== manifest.dim) {
      throw new Error('Semantic model dimension does not match the bundle');
    }
    bundleId = manifest.bundle_id;
    embedder = {
      embed: onnx.embed,
      getDim: onnx.getDim,
      isReady: onnx.isReady,
      type: 'onnx',
    };
    return embedder;
  })();

  try {
    return await initialization;
  } finally {
    initialization = null;
  }
}

export function getEmbedderType(): 'onnx' | 'none' {
  return embedder?.type ?? 'none';
}

export async function resetEmbedder(): Promise<void> {
  if (initialization !== null) {
    await initialization;
  }
  embedder = null;
  bundleId = null;
  await unloadOnnxEmbedder();
}
