import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export type LanguageFilter = 'pl' | 'en' | 'all';

// To add a new country, just uncomment/add it below.
// The type `CountryFilter` is derived from this list automatically.
const COUNTRY_CODES = [
  'PL',
  // 'LT',
  // 'LV',
  // 'EE',
  // 'FI',
  // 'SE',
  // 'NO',
] as const;

export type CountryFilter = (typeof COUNTRY_CODES)[number] | 'all';
export type SearchMode = 'fast' | 'accurate';
export type IdleUnloadTimeout = 'off' | 10 | 20 | 30 | 60 | 120;
export type DebounceMs = 200 | 250 | 400;
export type MinQueryLength = 2 | 3;

// Available countries (for future UI dropdown)
export const AVAILABLE_COUNTRIES: { code: CountryFilter; flag: string; name: { pl: string; en: string } }[] = [
  { code: 'PL', flag: '🇵🇱', name: { pl: 'Polska', en: 'Poland' } },
  // { code: 'LT', flag: '🇱🇹', name: { pl: 'Litwa', en: 'Lithuania' } },
  // { code: 'LV', flag: '🇱🇻', name: { pl: 'Łotwa', en: 'Latvia' } },
  // { code: 'EE', flag: '🇪🇪', name: { pl: 'Estonia', en: 'Estonia' } },
  // { code: 'FI', flag: '🇫🇮', name: { pl: 'Finlandia', en: 'Finland' } },
  // { code: 'SE', flag: '🇸🇪', name: { pl: 'Szwecja', en: 'Sweden' } },
  // { code: 'NO', flag: '🇳🇴', name: { pl: 'Norwegia', en: 'Norway' } },
];

type SearchSettingsState = {
  languageFilter: LanguageFilter;
  languageFilterExplicit: boolean; // true = user manually set filter, false = follow UI language
  countryFilter: CountryFilter;
  searchMode: SearchMode;
  alpha: number; // semantic weight 0-1, maps from sensitivity slider
  beta: number;  // keyword weight 0-1, always = 1 - alpha
  batteryMode: 'eco' | 'performance';
  idleUnloadTimeout: IdleUnloadTimeout;
  debounceMs: DebounceMs;
  minQueryLength: MinQueryLength;
  isHydrated: boolean; // true when settings loaded from storage
};

type SearchSettingsContextValue = SearchSettingsState & {
  setLanguageFilter: (filter: LanguageFilter) => void;
  syncLanguageFilterFromUi: (uiLanguage: 'pl' | 'en') => void;
  setCountryFilter: (filter: CountryFilter) => void;
  setSearchMode: (mode: SearchMode) => void;
  setAlpha: (alpha: number) => void;
  setBatteryMode: (mode: 'eco' | 'performance') => void;
  setIdleUnloadTimeout: (timeout: IdleUnloadTimeout) => void;
  setDebounceMs: (ms: DebounceMs) => void;
  setMinQueryLength: (len: MinQueryLength) => void;
  resetToDefaults: () => void;
  // Computed selectors - single source of truth
  getMaxCandidates: () => number;
  getTopK: () => number;
  getNumThreads: () => number;
  // Get effective language filter: returns user's choice if explicit, or UI language if not
  getEffectiveLang: (uiLanguage: 'pl' | 'en') => 'pl' | 'en' | undefined;
  // Get effective country filter: returns country code or undefined for all
  getEffectiveCountry: () => string | undefined;
  // Keyword score normalization helper
  normalizeKeywordScore: (rawScore: number, maxPossible: number) => number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'search_settings_v1';

// Single source of truth for max_candidates
const MAX_CANDIDATES_FAST = 150;
const MAX_CANDIDATES_ACCURATE = 400;

// Battery mode -> num_threads
const NUM_THREADS_ECO = 2;
const NUM_THREADS_PERFORMANCE = 4;

// Default values
const DEFAULTS: Omit<SearchSettingsState, 'isHydrated'> = {
  languageFilter: 'pl',
  languageFilterExplicit: false, // false = follow UI language
  countryFilter: COUNTRY_CODES[0], // Default: first enabled country
  searchMode: 'fast',
  alpha: 0.85,
  beta: 0.15,
  batteryMode: 'eco',
  idleUnloadTimeout: 30,
  debounceMs: 250,
  minQueryLength: 2,
};

// ============================================================================
// CONTEXT
// ============================================================================

const SearchSettingsContext = createContext<SearchSettingsContextValue | null>(null);

export function SearchSettingsProvider({ children }: { children: React.ReactNode }) {
  const [languageFilter, setLanguageFilterState] = useState<LanguageFilter>(DEFAULTS.languageFilter);
  const [languageFilterExplicit, setLanguageFilterExplicit] = useState<boolean>(DEFAULTS.languageFilterExplicit);
  const [countryFilter, setCountryFilterState] = useState<CountryFilter>(DEFAULTS.countryFilter);
  const [searchMode, setSearchModeState] = useState<SearchMode>(DEFAULTS.searchMode);
  const [alpha, setAlphaState] = useState(DEFAULTS.alpha);
  const [beta, setBetaState] = useState(DEFAULTS.beta);
  const [batteryMode, setBatteryModeState] = useState<'eco' | 'performance'>(DEFAULTS.batteryMode);
  const [idleUnloadTimeout, setIdleUnloadTimeoutState] = useState<IdleUnloadTimeout>(DEFAULTS.idleUnloadTimeout);
  const [debounceMs, setDebounceMsState] = useState<DebounceMs>(DEFAULTS.debounceMs);
  const [minQueryLength, setMinQueryLengthState] = useState<MinQueryLength>(DEFAULTS.minQueryLength);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load settings from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.languageFilter) setLanguageFilterState(parsed.languageFilter);
          if (typeof parsed.languageFilterExplicit === 'boolean') setLanguageFilterExplicit(parsed.languageFilterExplicit);
          if (parsed.countryFilter) setCountryFilterState(parsed.countryFilter);
          if (parsed.searchMode) setSearchModeState(parsed.searchMode);
          if (typeof parsed.alpha === 'number') {
            setAlphaState(parsed.alpha);
            setBetaState(1 - parsed.alpha);
          }
          if (parsed.batteryMode) setBatteryModeState(parsed.batteryMode);
          if (parsed.idleUnloadTimeout !== undefined) setIdleUnloadTimeoutState(parsed.idleUnloadTimeout);
          if (parsed.debounceMs) setDebounceMsState(parsed.debounceMs);
          if (parsed.minQueryLength) setMinQueryLengthState(parsed.minQueryLength);
        }
      } catch {
        // Ignore errors - use defaults
      }
      setIsHydrated(true);
    })();
  }, []);

  // Persist settings to storage
  const persistSettings = useCallback(async (newState: Partial<Omit<SearchSettingsState, 'isHydrated'>>) => {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      const updated = { ...parsed, ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore errors
    }
  }, []);

  // Setters with persistence
  const setLanguageFilter = useCallback((filter: LanguageFilter) => {
    setLanguageFilterState(filter);
    setLanguageFilterExplicit(true); // User explicitly chose this filter
    persistSettings({ languageFilter: filter, languageFilterExplicit: true });
  }, [persistSettings]);

  const syncLanguageFilterFromUi = useCallback((uiLanguage: 'pl' | 'en') => {
    if (!isHydrated) return;
    if (languageFilterExplicit) return;
    setLanguageFilterState(uiLanguage);
    persistSettings({ languageFilter: uiLanguage, languageFilterExplicit: false });
  }, [isHydrated, languageFilterExplicit, persistSettings]);

  const setCountryFilter = useCallback((filter: CountryFilter) => {
    setCountryFilterState(filter);
    persistSettings({ countryFilter: filter });
  }, [persistSettings]);

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeState(mode);
    persistSettings({ searchMode: mode });
  }, [persistSettings]);

  const setAlpha = useCallback((newAlpha: number) => {
    // Clamp alpha to valid range [0.5, 0.95]
    const clamped = Math.max(0.5, Math.min(0.95, newAlpha));
    setAlphaState(clamped);
    setBetaState(1 - clamped);
    persistSettings({ alpha: clamped });
  }, [persistSettings]);

  const setBatteryMode = useCallback((mode: 'eco' | 'performance') => {
    setBatteryModeState(mode);
    persistSettings({ batteryMode: mode });
  }, [persistSettings]);

  const setIdleUnloadTimeout = useCallback((timeout: IdleUnloadTimeout) => {
    setIdleUnloadTimeoutState(timeout);
    persistSettings({ idleUnloadTimeout: timeout });
  }, [persistSettings]);

  const setDebounceMs = useCallback((ms: DebounceMs) => {
    setDebounceMsState(ms);
    persistSettings({ debounceMs: ms });
  }, [persistSettings]);

  const setMinQueryLength = useCallback((len: MinQueryLength) => {
    setMinQueryLengthState(len);
    persistSettings({ minQueryLength: len });
  }, [persistSettings]);

  // Reset all settings to defaults
  const resetToDefaults = useCallback(async () => {
    setLanguageFilterState(DEFAULTS.languageFilter);
    setLanguageFilterExplicit(DEFAULTS.languageFilterExplicit);
    setCountryFilterState(DEFAULTS.countryFilter);
    setSearchModeState(DEFAULTS.searchMode);
    setAlphaState(DEFAULTS.alpha);
    setBetaState(DEFAULTS.beta);
    setBatteryModeState(DEFAULTS.batteryMode);
    setIdleUnloadTimeoutState(DEFAULTS.idleUnloadTimeout);
    setDebounceMsState(DEFAULTS.debounceMs);
    setMinQueryLengthState(DEFAULTS.minQueryLength);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  // ============================================================================
  // COMPUTED SELECTORS - Single source of truth
  // ============================================================================

  // max_candidates: Fast=150, Accurate=400
  const getMaxCandidates = useCallback(() => {
    return searchMode === 'fast' ? MAX_CANDIDATES_FAST : MAX_CANDIDATES_ACCURATE;
  }, [searchMode]);

  // topK: always 10
  const getTopK = useCallback(() => 10, []);

  // num_threads: Eco=2, Performance=4
  const getNumThreads = useCallback(() => {
    return batteryMode === 'eco' ? NUM_THREADS_ECO : NUM_THREADS_PERFORMANCE;
  }, [batteryMode]);

  // Get effective language filter:
  // - If user explicitly set filter: use languageFilter ('pl' | 'en' | 'all')
  // - If not explicit: follow UI language
  // Returns: 'pl' | 'en' | undefined (undefined = show all)
  const getEffectiveLang = useCallback((uiLanguage: 'pl' | 'en'): 'pl' | 'en' | undefined => {
    if (languageFilterExplicit) {
      // User explicitly chose - respect their choice
      return languageFilter === 'all' ? undefined : languageFilter;
    }
    // Not explicit - follow UI language
    return uiLanguage;
  }, [languageFilter, languageFilterExplicit]);

  // Get effective country filter:
  // Returns: country code or undefined (undefined = show all countries)
  const getEffectiveCountry = useCallback((): string | undefined => {
    return countryFilter === 'all' ? undefined : countryFilter;
  }, [countryFilter]);

  // ============================================================================
  // KEYWORD SCORE NORMALIZATION
  // ============================================================================
  // Normalizes keyword_score to [0,1] for hybrid ranking
  // rawScore = number of matched tokens
  // maxPossible = number of query tokens
  // Returns: normalized value in [0,1]
  const normalizeKeywordScore = useCallback((rawScore: number, maxPossible: number): number => {
    if (maxPossible <= 0) return 0;
    return Math.min(1, rawScore / maxPossible);
  }, []);

  const value = useMemo<SearchSettingsContextValue>(() => ({
    languageFilter,
    languageFilterExplicit,
    countryFilter,
    searchMode,
    alpha,
    beta,
    batteryMode,
    idleUnloadTimeout,
    debounceMs,
    minQueryLength,
    isHydrated,
    setLanguageFilter,
    syncLanguageFilterFromUi,
    setCountryFilter,
    setSearchMode,
    setAlpha,
    setBatteryMode,
    setIdleUnloadTimeout,
    setDebounceMs,
    setMinQueryLength,
    resetToDefaults,
    getMaxCandidates,
    getTopK,
    getNumThreads,
    getEffectiveLang,
    getEffectiveCountry,
    normalizeKeywordScore,
  }), [
    languageFilter, languageFilterExplicit, countryFilter, searchMode, alpha, beta, batteryMode,
    idleUnloadTimeout, debounceMs, minQueryLength, isHydrated,
    setLanguageFilter, syncLanguageFilterFromUi, setCountryFilter, setSearchMode, setAlpha, setBatteryMode,
    setIdleUnloadTimeout, setDebounceMs, setMinQueryLength, resetToDefaults,
    getMaxCandidates, getTopK, getNumThreads, getEffectiveLang, getEffectiveCountry, normalizeKeywordScore,
  ]);

  return (
    <SearchSettingsContext.Provider value={value}>
      {children}
    </SearchSettingsContext.Provider>
  );
}

export function useSearchSettings(): SearchSettingsContextValue {
  const ctx = useContext(SearchSettingsContext);
  if (!ctx) {
    throw new Error('useSearchSettings must be used within SearchSettingsProvider');
  }
  return ctx;
}

// ============================================================================
// IDLE TIMER HOOK (for embedder auto-unload)
// ============================================================================
// Rules:
// - If idleUnloadTimeout === 'off' -> timer is disabled, no cleanup
// - Timer resets on every embedder usage (search trigger)
// - Timer does NOT run while user is actively typing (resetIdleTimer called)
// - On screen unmount -> cleanup timer, optionally unload embedder

type IdleTimerCallbacks = {
  onIdle: () => void;
};

export function useIdleTimer(
  idleUnloadTimeout: IdleUnloadTimeout,
  callbacks: IdleTimerCallbacks
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    // If 'off', do nothing
    if (idleUnloadTimeout === 'off') return;

    clearTimer();
    const timeoutMs = idleUnloadTimeout * 1000;
    timerRef.current = setTimeout(() => {
      callbacks.onIdle();
    }, timeoutMs);
  }, [idleUnloadTimeout, clearTimer, callbacks]);

  // Call this on every embedder usage
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    startTimer();
  }, [startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { resetIdleTimer, clearTimer };
}

// ============================================================================
// SEARCH TRIGGER LOGIC
// ============================================================================
// Rules for minQuery vs debounce:
// 1. If query.length < minQueryLength -> do NOT trigger search, show empty state
// 2. If query.length >= minQueryLength -> start debounce timer
// 3. On Enter key -> immediately trigger search (bypass debounce), clear debounce timer
// 4. On new keystroke -> reset debounce timer
// 5. Debounce timer fires -> trigger search if query still >= minQueryLength

export function shouldTriggerSearch(queryLength: number, minQueryLength: MinQueryLength): boolean {
  return queryLength >= minQueryLength;
}
