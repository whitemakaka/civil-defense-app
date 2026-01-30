import { NativeModules, Platform } from 'react-native';

type OfflineSearchNativeModule = {
  warmup: () => Promise<boolean>;
  tokenize: (text: string, maxLength: number) => Promise<{ inputIds: number[]; attentionMask: number[] }>;
  scoreCandidates: (queryVec: number[], candidates: number[], dim: number) => Promise<number[]>;
};

const Native = NativeModules.OfflineSearch as OfflineSearchNativeModule | undefined;

function requireAndroid(): OfflineSearchNativeModule {
  if (Platform.OS !== 'android') {
    throw new Error('OfflineSearch native module is Android-only');
  }
  if (!Native) {
    throw new Error('OfflineSearch native module is not linked');
  }
  return Native;
}

export const OfflineSearchNative = {
  warmup: async () => requireAndroid().warmup(),
  tokenize: async (text: string, maxLength: number) => requireAndroid().tokenize(text, maxLength),
  scoreCandidates: async (queryVec: Float32Array, candidates: number[], dim: number) => {
    // Keep the JS/native bridge payload small and predictable.
    return requireAndroid().scoreCandidates(Array.from(queryVec), candidates, dim);
  },
};

