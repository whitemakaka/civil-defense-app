/**
 * ONNX Embedder
 * Real on-device semantic embeddings using ONNX Runtime
 * v4a: SentencePiece tokenization outside ONNX graph (no ORT Extensions)
 */

import { OfflineSearchNative } from '../native/OfflineSearchNative';

// Lazy import - native module may not be ready at top-level
let ORT: typeof import('onnxruntime-react-native') | undefined;

async function getORT() {
  if (!ORT) {
    ORT = require('onnxruntime-react-native');
  }
  return ORT!;
}

const EMBEDDING_DIM = 384;

let session: any = null;
let isLoading = false;
let inputNames: string[] = [];
let outputNames: string[] = [];
let maxLength: number = 128;

export interface OnnxEmbedder {
  embed(text: string): Promise<Float32Array>;
  getDim(): number;
  isReady(): boolean;
}

export async function createOnnxEmbedder(): Promise<OnnxEmbedder> {
  await loadModel();
  
  return {
    embed: embedText,
    getDim: () => EMBEDDING_DIM,
    isReady: () => session !== null,
  };
}

async function loadModel(): Promise<void> {
  if (session || isLoading) return;
  
  isLoading = true;
  
  try {
    const ort = await getORT();

    // Load manifest to get model path and IO names.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNFS = require('react-native-fs');
    const manifestRaw = await RNFS.readFileAssets('offline_bundle/manifest.json', 'utf8');
    const manifest = JSON.parse(manifestRaw) as {
      onnx_file?: string;
      max_length?: number;
    };
    maxLength = manifest.max_length ?? 128;

    // Load ONNX model from Android assets (avoid Metro/expo-asset for large files).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const assetRelPath = manifest.onnx_file ? `offline_bundle/${manifest.onnx_file}` : 'offline_bundle/model/model.int8.onnx';
    const fileName = String(assetRelPath).split('/').pop() || 'model.int8.onnx';
    const dstPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

    const exists = await RNFS.exists(dstPath);
    if (!exists) {
      if (typeof RNFS.copyFileAssets === 'function') {
        await RNFS.copyFileAssets(assetRelPath, dstPath);
      } else {
        // Fallback (may be slow / memory heavy)
        const b64 = await RNFS.readFileAssets(assetRelPath, 'base64');
        await RNFS.writeFile(dstPath, b64, 'base64');
      }
    }

    session = await ort.InferenceSession.create(dstPath);
    inputNames = Array.isArray(session.inputNames) ? session.inputNames : [];
    outputNames = Array.isArray(session.outputNames) ? session.outputNames : [];
    
    console.log('[OnnxEmbedder] Model loaded successfully (v4a)');
  } catch (error) {
    console.error('[OnnxEmbedder] Failed to load model:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

async function embedText(text: string): Promise<Float32Array> {
  if (!session) {
    throw new Error('Model not loaded. Call createOnnxEmbedder() first.');
  }
  
  const ort = await getORT();

  // v4a: tokenize outside ONNX graph (SentencePiece).
  const { inputIds, attentionMask } = await OfflineSearchNative.tokenize(text, maxLength);
  if (inputIds.length !== maxLength || attentionMask.length !== maxLength) {
    throw new Error(`Tokenizer returned unexpected length (ids=${inputIds.length}, mask=${attentionMask.length})`);
  }

  const ids = BigInt64Array.from(inputIds.map((x) => BigInt(x)));
  const mask = BigInt64Array.from(attentionMask.map((x) => BigInt(x)));

  const idsTensor = new ort.Tensor('int64', ids, [1, maxLength]);
  const maskTensor = new ort.Tensor('int64', mask, [1, maxLength]);

  const feeds: Record<string, any> = {};
  const findName = (needle: string) => inputNames.find((n) => n === needle || n.includes(needle));
  const inputIdsName = findName('input_ids') ?? inputNames[0];
  const attnName = findName('attention_mask') ?? inputNames.find((n) => n !== inputIdsName);
  if (!inputIdsName || !attnName) {
    throw new Error(`Unexpected model inputs: ${JSON.stringify(inputNames)}`);
  }
  feeds[inputIdsName] = idsTensor;
  feeds[attnName] = maskTensor;

  const tokenTypeName = findName('token_type_ids');
  if (tokenTypeName) {
    const zeros = new BigInt64Array(maxLength);
    feeds[tokenTypeName] = new ort.Tensor('int64', zeros, [1, maxLength]);
  }

  const results = await session.run(feeds);
  const outName =
    outputNames.find((n) => n.includes('last_hidden_state')) ??
    outputNames.find((n) => n.includes('hidden')) ??
    outputNames[0] ??
    Object.keys(results)[0];

  const output = results[outName] ?? results[Object.keys(results)[0]];
  const data = output?.data as Float32Array | undefined;
  const dims = output?.dims as number[] | undefined;
  if (!data || !dims || dims.length < 1) {
    throw new Error('Model output is missing');
  }

  const vec = poolAndNormalize(data, dims, attentionMask, EMBEDDING_DIM);
  return vec;
}

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }
  
  return vec;
}

function poolAndNormalize(
  data: Float32Array,
  dims: number[],
  attentionMask: number[],
  dim: number
): Float32Array {
  // Common shapes:
  // - [1, seq, hidden] -> mean pooling with attention mask
  // - [1, hidden] or [hidden] -> already pooled
  if (dims.length === 3) {
    const seq = dims[1] ?? 0;
    const hidden = dims[2] ?? 0;
    if (hidden !== dim) {
      throw new Error(`Unexpected hidden size: ${hidden} (expected ${dim})`);
    }

    const out = new Float32Array(dim);
    let count = 0;
    for (let t = 0; t < seq; t++) {
      if ((attentionMask[t] ?? 0) === 0) continue;
      const base = t * dim;
      for (let j = 0; j < dim; j++) {
        out[j] += data[base + j] ?? 0;
      }
      count++;
    }
    if (count > 0) {
      for (let j = 0; j < dim; j++) out[j] /= count;
    }
    return l2Normalize(out);
  }

  if (dims.length === 2) {
    const hidden = dims[1] ?? 0;
    if (hidden !== dim) {
      throw new Error(`Unexpected output size: ${hidden} (expected ${dim})`);
    }
    return l2Normalize(new Float32Array(data.slice(0, dim)));
  }

  if (dims.length === 1) {
    if (dims[0] !== dim) {
      throw new Error(`Unexpected output size: ${dims[0]} (expected ${dim})`);
    }
    return l2Normalize(new Float32Array(data.slice(0, dim)));
  }

  throw new Error(`Unsupported output shape: ${JSON.stringify(dims)}`);
}

export function isOnnxEmbedderReady(): boolean {
  return session !== null;
}

export async function unloadOnnxEmbedder(): Promise<void> {
  // Best-effort cleanup. API shape differs by ORT version.
  try {
    const s = session;
    session = null;
    if (s && typeof s.release === 'function') {
      await s.release();
    } else if (s && typeof s.dispose === 'function') {
      await s.dispose();
    }
  } catch {
    // ignore
  }
}
