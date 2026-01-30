/**
 * Embedder factory
 * ONNX only (no fallback)
 */

import { createOnnxEmbedder, unloadOnnxEmbedder } from './OnnxEmbedder';

export interface Embedder {
  embed(text: string): Float32Array | Promise<Float32Array>;
  getDim(): number;
  isReady(): boolean;
  type: 'onnx';
}

let embedderInstance: Embedder | null = null;
let initPromise: Promise<Embedder> | null = null;

export async function getEmbedder(dim: number): Promise<Embedder> {
  if (embedderInstance) return embedderInstance;
  
  if (initPromise) return initPromise;
  
  initPromise = initEmbedder(dim);
  return initPromise;
}

async function initEmbedder(dim: number): Promise<Embedder> {
  const onnx = await createOnnxEmbedder();
  embedderInstance = {
    embed: (text: string) => onnx.embed(text),
    getDim: () => onnx.getDim(),
    isReady: () => onnx.isReady(),
    type: 'onnx',
  };
  console.log('[Embedder] ONNX loaded - real semantic search');
  return embedderInstance;
}

export function getEmbedderSync(dim: number): Embedder {
  if (!embedderInstance) {
    throw new Error('Embedder not initialized. Use getEmbedder() first.');
  }
  return embedderInstance;
}

export function isEmbedderReady(): boolean {
  return embedderInstance !== null && embedderInstance.isReady();
}

export function getEmbedderType(): 'onnx' | 'none' {
  return embedderInstance?.type ?? 'none';
}

export async function resetEmbedder(): Promise<void> {
  const current = embedderInstance;
  embedderInstance = null;
  initPromise = null;

  if (current?.type === 'onnx') {
    await unloadOnnxEmbedder();
  }
}
