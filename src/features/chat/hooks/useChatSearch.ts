/**
 * useChatSearch - chat screen search flow (contract K5).
 * Debounced search while typing, without clearing the visible list on every keystroke;
 * relevance filtering; localized error text; re-search on language change.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STRINGS, type Language } from '../../../constants/strings';
import { useSemanticSearch, type DebugInfo } from '../../search/hooks/useSemanticSearch';
import { filterRelevant, getRelevanceConfig } from '../../search/domain/services/filterRelevant';
import type { SearchConfig, SearchErrorCode, SearchResult } from '../../search/types';

export type IndexStatus = 'idle' | 'loading' | 'searching' | 'ready' | 'error';

export interface UseChatSearchParams {
  searchConfig: SearchConfig;
  language: Language;
}

export interface UseChatSearchResult {
  inputText: string;
  onChangeText(text: string): void;
  onSubmit(): void;
  onFocus(): void;
  results: SearchResult[];
  isSearching: boolean;
  isStale: boolean;
  noMatch: boolean;
  indexStatus: IndexStatus;
  errorText: string | null;
  debug: DebugInfo | null;
  takeResult(result: SearchResult): { query: string; result: SearchResult };
  localizeResult(result: SearchResult, language: Language): SearchResult;
}

const ERROR_KEYS: Record<SearchErrorCode, 'errorIndex' | 'errorModel' | 'errorSearch'> = {
  index: 'errorIndex',
  model: 'errorModel',
  search: 'errorSearch',
};

export function useChatSearch({ searchConfig, language }: UseChatSearchParams): UseChatSearchResult {
  const {
    status,
    results: liveResults,
    debug,
    search,
    clearResults,
    resetIdleTimer,
    prewarmEmbedder,
    isSemanticReady,
    isSemanticLoading,
    resultsQuery,
    error,
    localizeResult,
  } = useSemanticSearch({
    autoLoad: true,
    autoWarmEmbedder: true,
    idleUnloadTimeout: searchConfig.idle_unload_seconds,
    idleUnloadMode: 'embedder',
  });

  const [inputText, setInputText] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageRef = useRef(language);

  const minimum = searchConfig.minimum_query_length;
  const trimmed = inputText.trim();
  const isSearching = status === 'searching';

  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const runSearch = useCallback((query: string) => {
    resetIdleTimer();
    void search(query, {
      lang: language,
      localWeight: searchConfig.local_weight,
      globalWeight: searchConfig.global_weight,
      topK: searchConfig.top_k,
    });
  }, [search, resetIdleTimer, language, searchConfig]);

  const onChangeText = useCallback((text: string) => {
    setInputText(text);
    resetIdleTimer();
    cancelDebounce();
    const query = text.trim();
    if (query.length < minimum) { clearResults(); return; }
    // Results for this exact query are already shown; a search still in flight
    // for another query must be superseded, so only skip when idle.
    if (query === resultsQuery && !isSearching) return;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runSearch(query);
    }, searchConfig.debounce_ms);
  }, [resetIdleTimer, cancelDebounce, minimum, clearResults, resultsQuery, isSearching, runSearch, searchConfig.debounce_ms]);

  const onSubmit = useCallback(() => {
    cancelDebounce();
    if (trimmed.length >= minimum) runSearch(trimmed);
  }, [cancelDebounce, trimmed, minimum, runSearch]);

  const onFocus = useCallback(() => {
    resetIdleTimer();
    void prewarmEmbedder();
  }, [resetIdleTimer, prewarmEmbedder]);

  const takeResult = useCallback((result: SearchResult) => {
    cancelDebounce();
    const query = inputText.trim();
    setInputText('');
    clearResults();
    return { query, result };
  }, [cancelDebounce, inputText, clearResults]);

  // Re-run a pending query only when the display language changes (not on mount).
  useEffect(() => {
    if (languageRef.current === language) return;
    languageRef.current = language;
    cancelDebounce();
    clearResults();
    if (trimmed.length >= minimum) runSearch(trimmed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => () => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  const results = useMemo(
    () => filterRelevant(liveResults, getRelevanceConfig(searchConfig)),
    [liveResults, searchConfig],
  );

  const isStale = resultsQuery !== null && resultsQuery !== trimmed;
  const noMatch = trimmed.length >= minimum && !isSearching && resultsQuery === trimmed && results.length === 0;
  const indexStatus: IndexStatus = status === 'ready'
    ? (isSemanticLoading ? 'loading' : (isSemanticReady ? 'ready' : 'idle'))
    : status;
  const errorText = error === null ? null : STRINGS[language][ERROR_KEYS[error]];

  return {
    inputText,
    onChangeText,
    onSubmit,
    onFocus,
    results,
    isSearching,
    isStale,
    noMatch,
    indexStatus,
    errorText,
    debug,
    takeResult,
    localizeResult,
  };
}
