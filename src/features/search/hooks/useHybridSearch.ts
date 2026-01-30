/**
 * useHybridSearch hook - manages hybrid search lifecycle
 * Privacy: No logging, no network, no query saving
 */
import { useCallback, useEffect } from 'react';
import type { SearchOptions } from '../types';
import { loadBundle } from '../infrastructure/loaders/BundleLoader';
import { getEmbedder, getEmbedderType, resetEmbedder } from '../infrastructure/embedders';
import { useSearchState, type DebugInfo } from './useSearchState';
import { useIdleUnload } from './useIdleUnload';
import { executeSearch } from './executeSearch';

export type { DebugInfo };

interface UseHybridSearchOptions {
  autoLoad?: boolean;
  autoWarmEmbedder?: boolean;
  idleUnloadTimeout?: number | 'off';
  idleUnloadMode?: 'bundle' | 'embedder' | 'all';
}

export function useHybridSearch(options: UseHybridSearchOptions = {}) {
  const { autoLoad = false, autoWarmEmbedder = false, idleUnloadTimeout = 30, idleUnloadMode = 'bundle' } = options;

  const state = useSearchState();
  const { bundleRef, loadPromiseRef, setStatus, setError, setRecordCount, setResults, setDebug, setResultsQuery, setEmbedderType, setIsSemanticReady, setIsSemanticLoading, resetBundle, resetEmbedderState, clearResults } = state;

  const idle = useIdleUnload(idleUnloadTimeout, idleUnloadMode, {
    onUnloadBundle: resetBundle,
    onUnloadEmbedder: () => { void resetEmbedder(); resetEmbedderState(); },
  });

  const loadIndex = useCallback(async () => {
    if (bundleRef.current || loadPromiseRef.current) {
      if (loadPromiseRef.current) await loadPromiseRef.current;
      return;
    }
    setStatus('loading');
    setError(null);

    loadPromiseRef.current = (async () => {
      try {
        bundleRef.current = await loadBundle();
        setRecordCount(bundleRef.current.records.length);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load index');
        setStatus('error');
      } finally {
        loadPromiseRef.current = null;
      }
    })();
    await loadPromiseRef.current;
  }, [bundleRef, loadPromiseRef, setStatus, setError, setRecordCount]);

  const prewarmEmbedder = useCallback(async () => {
    if (!bundleRef.current) await loadIndex();
    const bundle = bundleRef.current;
    if (!bundle) return;

    setIsSemanticLoading(true);
    try {
      const embedder = await getEmbedder(bundle.dim);
      const t = getEmbedderType();
      setEmbedderType(t);
      setIsSemanticReady(t === 'onnx' && embedder.isReady());
    } catch {
      setEmbedderType('none');
      setIsSemanticReady(false);
      setError('Semantic model failed');
      setStatus('error');
    } finally {
      setIsSemanticLoading(false);
    }
  }, [bundleRef, loadIndex, setIsSemanticLoading, setEmbedderType, setIsSemanticReady, setError, setStatus]);

  const search = useCallback(async (query: string, searchOptions: SearchOptions = {}) => {
    const trimmed = query.trim();
    if (!trimmed) { clearResults(); return; }

    if (!bundleRef.current) await loadIndex();
    const bundle = bundleRef.current;
    if (!bundle) { setError('Index not loaded'); setStatus('error'); return; }

    setStatus('searching');
    idle.touch();

    try {
      const result = await executeSearch(trimmed, bundle, searchOptions);
      setResults(result.results);
      setDebug(result.debug);
      setResultsQuery(trimmed);
      setEmbedderType(result.embedderType);
      setIsSemanticReady(result.isSemanticReady);
      setStatus('ready');
      idle.touch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setStatus('error');
    }
  }, [bundleRef, loadIndex, clearResults, idle, setStatus, setError, setResults, setDebug, setResultsQuery, setEmbedderType, setIsSemanticReady]);

  useEffect(() => { if (autoLoad) loadIndex(); }, [autoLoad, loadIndex]);
  useEffect(() => { if (autoWarmEmbedder) void prewarmEmbedder(); }, [autoWarmEmbedder, prewarmEmbedder]);
  useEffect(() => () => idle.clear(), [idle]);

  return {
    status: state.status,
    error: state.error,
    results: state.results,
    debug: state.debug,
    recordCount: state.recordCount,
    loadIndex,
    prewarmEmbedder,
    embedderType: state.embedderType,
    isSemanticReady: state.isSemanticReady,
    isSemanticLoading: state.isSemanticLoading,
    resultsQuery: state.resultsQuery,
    search,
    clearResults,
    resetIdleTimer: idle.reset,
    isReady: state.status === 'ready',
  };
}
