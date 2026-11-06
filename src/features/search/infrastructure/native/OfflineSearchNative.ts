import { NativeModules, Platform } from 'react-native';

type OfflineSearchNativeModule = {
  warmup: () => Promise<boolean>;
  loadModel: () => Promise<boolean>;
  embed: (text: string) => Promise<number[]>;
  releaseModel: () => Promise<boolean>;
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
  /** Opens the model directly from the installed app; nothing is copied to storage. */
  loadModel: async () => requireAndroid().loadModel(),
  embed: async (text: string) => requireAndroid().embed(text),
  releaseModel: async () => requireAndroid().releaseModel(),
  scoreCandidates: async (queryVec: Float32Array, candidates: number[], dim: number) => {
    // Keep the JS/native bridge payload small and predictable.
    return requireAndroid().scoreCandidates(Array.from(queryVec), candidates, dim);
  },
};
