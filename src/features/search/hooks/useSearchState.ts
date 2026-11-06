import { useState, useRef, useCallback } from 'react';
import type { SearchErrorCode, SearchResult } from '../types';
import type { LoadedBundle } from '../infrastructure/loaders/BundleLoader';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'searching' | 'error';

export interface DebugInfo {
  avgLocalScore: number;
  avgGlobalScore: number;
}

export function useSearchState() {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<SearchErrorCode | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [isSemanticReady, setIsSemanticReady] = useState(false);
  const [isSemanticLoading, setIsSemanticLoading] = useState(false);
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);

  const bundleRef = useRef<LoadedBundle | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const searchRequestRef = useRef<symbol | null>(null);

  const clearResults = useCallback(() => {
    searchRequestRef.current = null;
    setStatus(previous => previous === 'searching' ? 'ready' : previous);
    setError(null);
    setResults([]);
    setDebug(null);
    setResultsQuery(null);
  }, []);

  const resetBundle = useCallback(() => {
    searchRequestRef.current = null;
    bundleRef.current = null;
    setResults([]);
    setDebug(null);
    setStatus('idle');
    setResultsQuery(null);
  }, []);

  const resetEmbedderState = useCallback(() => {
    setIsSemanticReady(false);
    setIsSemanticLoading(false);
  }, []);

  return {
    status, setStatus,
    error, setError,
    results, setResults,
    debug, setDebug,
    isSemanticReady, setIsSemanticReady,
    isSemanticLoading, setIsSemanticLoading,
    resultsQuery, setResultsQuery,
    bundleRef, loadPromiseRef,
    searchRequestRef,
    clearResults, resetBundle, resetEmbedderState,
  };
}
