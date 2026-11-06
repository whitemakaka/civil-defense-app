import { useMemo } from 'react';
import type { SearchConfig } from '../../features/search/types';
import { useBundle } from '../bundle/bundleStore';

interface SearchSettingsContextValue {
  searchConfig: SearchConfig | null;
  bundleConfigReady: boolean;
  configurationError: string | null;
}

export function useSearchSettings(): SearchSettingsContextValue {
  const bundle = useBundle();
  return useMemo<SearchSettingsContextValue>(() => {
    switch (bundle.status) {
      case 'loading':
        return { searchConfig: null, bundleConfigReady: false, configurationError: null };
      case 'ready':
        return { searchConfig: bundle.manifest.search, bundleConfigReady: true, configurationError: null };
      case 'error':
        return { searchConfig: null, bundleConfigReady: true, configurationError: bundle.error };
    }
  }, [bundle]);
}

export function shouldTriggerSearch(queryLength: number, minimumQueryLength: number): boolean {
  return queryLength >= minimumQueryLength;
}
