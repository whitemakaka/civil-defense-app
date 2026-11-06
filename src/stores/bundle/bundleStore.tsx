import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  loadManifest,
  loadSourceCatalog,
  type SourceCatalogEntry,
} from '../../features/search/infrastructure/loaders/BundleLoader';
import type { Manifest } from '../../features/search/types';

export type BundleState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: Manifest; sourceCatalog: SourceCatalogEntry[] | null }
  | { status: 'error'; error: string };

const BundleContext = createContext<BundleState | null>(null);

export function BundleProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<BundleState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let manifest: Manifest;
      try {
        manifest = await loadManifest();
      } catch (cause) {
        if (!cancelled) {
          setState({ status: 'error', error: cause instanceof Error ? cause.message : String(cause) });
        }
        return;
      }

      let sourceCatalog: SourceCatalogEntry[] | null;
      try {
        sourceCatalog = await loadSourceCatalog(manifest);
      } catch {
        sourceCatalog = null;
      }
      if (!cancelled) setState({ status: 'ready', manifest, sourceCatalog });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <BundleContext.Provider value={state}>{children}</BundleContext.Provider>;
}

export function useBundle(): BundleState {
  const value = useContext(BundleContext);
  if (value === null) throw new Error('useBundle must be used within BundleProvider');
  return value;
}
