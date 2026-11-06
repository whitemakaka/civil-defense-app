/**
 * useSemanticSearch hook - manages semantic search lifecycle
 * Privacy: No logging, no network, no query saving
 */
import { useCallback, useEffect } from 'react';
import type { SearchLanguage, SearchOptions, SearchResult } from '../types';
import { loadBundle } from '../infrastructure/loaders/BundleLoader';
import { getEmbedder, getEmbedderType, resetEmbedder } from '../infrastructure/embedders';
import { useSearchState, type DebugInfo } from './useSearchState';
import { useIdleUnload } from './useIdleUnload';
import { executeSearch } from './executeSearch';

export type { DebugInfo };

interface UseSemanticSearchOptions {
  autoLoad: boolean;
  autoWarmEmbedder: boolean;
  idleUnloadTimeout: number | 'off';
  idleUnloadMode: 'bundle' | 'embedder' | 'all';
}

export function useSemanticSearch(options: UseSemanticSearchOptions) {
  const { autoLoad, autoWarmEmbedder, idleUnloadTimeout, idleUnloadMode } = options;

  const state = useSearchState();
  const { searchRequestRef } = state;
  const { bundleRef, loadPromiseRef, setStatus, setError, setResults, setDebug, setResultsQuery, setIsSemanticReady, setIsSemanticLoading, resetBundle, resetEmbedderState, clearResults } = state;

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
        setStatus('ready');
      } catch {
        setError('index');
        setStatus('error');
      } finally {
        loadPromiseRef.current = null;
      }
    })();
    await loadPromiseRef.current;
  }, [bundleRef, loadPromiseRef, setStatus, setError]);

  const prewarmEmbedder = useCallback(async () => {
    if (!bundleRef.current) await loadIndex();
    const bundle = bundleRef.current;
    if (!bundle) return;

    setIsSemanticLoading(true);
    try {
      const embedder = await getEmbedder(bundle.manifest);
      setIsSemanticReady(getEmbedderType() === 'onnx' && embedder.isReady());
    } catch {
      setIsSemanticReady(false);
      setError('model');
      setStatus('error');
    } finally {
      setIsSemanticLoading(false);
    }
  }, [bundleRef, loadIndex, setIsSemanticLoading, setIsSemanticReady, setError, setStatus]);

  const search = useCallback(async (query: string, searchOptions: SearchOptions) => {
    const trimmed = query.trim();
    if (!trimmed) { clearResults(); return; }
    const request = Symbol();
    searchRequestRef.current = request;

    if (!bundleRef.current) await loadIndex();
    if (searchRequestRef.current !== request) return;
    const bundle = bundleRef.current;
    if (!bundle) { setError('index'); setStatus('error'); return; }

    setStatus('searching');
    setError(null);
    idle.touch();

    try {
      const result = await executeSearch(trimmed, bundle, searchOptions);
      if (searchRequestRef.current !== request) return;
      setResults(result.results);
      setDebug(result.debug);
      setResultsQuery(trimmed);
      setIsSemanticReady(result.isSemanticReady);
      setStatus('ready');
      idle.touch();
    } catch {
      if (searchRequestRef.current !== request) return;
      setError('search');
      setStatus('error');
    }
  }, [bundleRef, searchRequestRef, loadIndex, clearResults, idle, setStatus, setError, setResults, setDebug, setResultsQuery, setIsSemanticReady]);

  const localizeResult = useCallback((result: SearchResult, language: SearchLanguage): SearchResult => {
    const content = result.content[language];
    if (!content) throw new Error(`Missing note language ${result.id}/${language}`);
    return { ...result, ...content, lang: language };
  }, []);

  useEffect(() => { if (autoLoad) loadIndex(); }, [autoLoad, loadIndex]);
  useEffect(() => { if (autoWarmEmbedder) void prewarmEmbedder(); }, [autoWarmEmbedder, prewarmEmbedder]);
  useEffect(() => () => { searchRequestRef.current = null; }, [searchRequestRef]);

  return {
    status: state.status,
    error: state.error,
    results: state.results,
    debug: state.debug,
    prewarmEmbedder,
    isSemanticReady: state.isSemanticReady,
    isSemanticLoading: state.isSemanticLoading,
    resultsQuery: state.resultsQuery,
    search,
    localizeResult,
    clearResults,
    resetIdleTimer: idle.reset,
  };
}
