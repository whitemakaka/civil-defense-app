import { useState, useRef, useCallback } from 'react';
import type { SearchResult } from '../types';
import type { LoadedBundle } from '../infrastructure/loaders/BundleLoader';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'searching' | 'error';

export interface DebugInfo {
  tokens: string[];
  candidatesCount: number;
  keywordHits: Record<string, number>;
  mode: 'hybrid' | 'vector-only' | 'none';
  alpha: number;
  beta: number;
  avgVectorScore: number;
  avgKeywordScore: number;
  embedderType?: 'onnx' | 'none';
}

export function useSearchState() {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [embedderType, setEmbedderType] = useState<'onnx' | 'none'>('none');
  const [isSemanticReady, setIsSemanticReady] = useState(false);
  const [isSemanticLoading, setIsSemanticLoading] = useState(false);
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);

  const bundleRef = useRef<LoadedBundle | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setDebug(null);
    setResultsQuery(null);
  }, []);

  const resetBundle = useCallback(() => {
    bundleRef.current = null;
    setRecordCount(0);
    setResults([]);
    setDebug(null);
    setStatus('idle');
    setResultsQuery(null);
  }, []);

  const resetEmbedderState = useCallback(() => {
    setEmbedderType('none');
    setIsSemanticReady(false);
    setIsSemanticLoading(false);
  }, []);

  return {
    status, setStatus,
    error, setError,
    results, setResults,
    debug, setDebug,
    recordCount, setRecordCount,
    embedderType, setEmbedderType,
    isSemanticReady, setIsSemanticReady,
    isSemanticLoading, setIsSemanticLoading,
    resultsQuery, setResultsQuery,
    bundleRef, loadPromiseRef,
    clearResults, resetBundle, resetEmbedderState,
  };
}
