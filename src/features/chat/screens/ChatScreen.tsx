import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View, FlatList, Platform, KeyboardAvoidingView, ActivityIndicator, LayoutAnimation, UIManager, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import { useSettings } from '../../../stores/settings/settingsStore';
import { useSearchSettings, shouldTriggerSearch, AVAILABLE_COUNTRIES } from '../../../stores/settings/searchSettingsStore';
import { STRINGS } from '../../../constants/strings';
import { TopRightControls } from '../../../components/TopRightControls';
import { SettingsModal } from '../../../components/SettingsModal';
import { InfoModal } from '../../../components/InfoModal';
import { SearchDetailScreen } from '../../search/screens/SearchDetailScreen';
import { useHybridSearch } from '../../search/hooks/useHybridSearch';
import { formatQuoteText } from '../../search/utils/displayText';
import type { SearchResult } from '../../search/types';
import { SearchInsight, SuggestionsList, ChatInput, ChatMessageBubble, type ChatMessage } from '../components';

export default function ChatScreen() {
  const { language, colorScheme, theme, toggleColorScheme, toggleLanguage } = useSettings();
  const { alpha, beta, getMaxCandidates, getTopK, getEffectiveLang, getEffectiveCountry, countryFilter, idleUnloadTimeout, debounceMs, minQueryLength, isHydrated, syncLanguageFilterFromUi } = useSearchSettings();
  const { status: searchStatus, results: liveResults, debug, search, clearResults, resetIdleTimer, prewarmEmbedder, isSemanticReady, isSemanticLoading, resultsQuery, isReady, recordCount, error: searchError } = useHybridSearch({ autoLoad: true, autoWarmEmbedder: true, idleUnloadTimeout, idleUnloadMode: 'embedder' });

  const paddingH = useResponsiveValue<number>({ base: 12, sm: 16, md: 20, lg: 28, xl: 40 });
  const bubbleMaxWidth = useResponsiveValue({ base: '85%', md: '80%', lg: '72%', xl: '66%' }) as `${number}%`;
  const inputPaddingV = useResponsiveValue<number>({ base: 10, md: 12, lg: 14 });
  const suggestionsMaxHeight = useResponsiveValue<number>({ base: 300, md: 400, lg: 450 });

  const flatListRef = useRef<FlatList>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: 'welcome-assistant', role: 'assistant', text: language === 'pl' ? 'Cześć! Wyszukaj cytaty z oficjalnych poradników obrony cywilnej.' : 'Hi! Search quotes from official civil defense guides.' }]);
  const [inputText, setInputText] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const isSearching = searchStatus === 'searching';
  const trimmedQuery = inputText.trim();
  const isStaleResults = Boolean(resultsQuery && resultsQuery !== trimmedQuery);
  const showSuggestions = trimmedQuery.length >= minQueryLength || liveResults.length > 0 || isSearching;

  useEffect(() => { if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true); }, []);
  useEffect(() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }, [isSearching, liveResults.length, showSuggestions]);
  useEffect(() => { syncLanguageFilterFromUi(language); }, [language, isHydrated, syncLanguageFilterFromUi]);
  useEffect(() => { return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }; }, []);
  useEffect(() => { setMessages(prev => prev[0]?.id === 'welcome-assistant' ? [{ ...prev[0], text: language === 'pl' ? 'Cześć! Wyszukaj cytaty z oficjalnych poradników obrony cywilnej.' : 'Hi! Search quotes from official civil defense guides.' }, ...prev.slice(1)] : prev); }, [language]);

  const performSearch = useCallback(async (query: string) => {
    if (!shouldTriggerSearch(query.length, minQueryLength)) { clearResults(); return; }
    resetIdleTimer();
    await search(query, { lang: getEffectiveLang(language), country: getEffectiveCountry(), topK: getTopK(), alpha, beta, candidateSetSize: getMaxCandidates() });
  }, [search, clearResults, language, alpha, beta, getMaxCandidates, getTopK, getEffectiveLang, getEffectiveCountry, minQueryLength, resetIdleTimer]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    resetIdleTimer();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const trimmed = text.trim();
    if (!shouldTriggerSearch(trimmed.length, minQueryLength)) { clearResults(); return; }
    debounceTimerRef.current = setTimeout(() => performSearch(trimmed), debounceMs);
  }, [performSearch, debounceMs, minQueryLength, clearResults, resetIdleTimer]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', text: inputText.trim() }, { id: `assistant-${Date.now()}`, role: 'assistant', text: formatQuoteText(result.content), result }]);
    setInputText('');
    clearResults();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, clearResults]);

  const handleFocus = useCallback(() => { resetIdleTimer(); void prewarmEmbedder(); }, [resetIdleTimer, prewarmEmbedder]);

  if (!isHydrated) return <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}><View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.primary} /></View></SafeAreaView>;
  if (selectedResult) return <SearchDetailScreen hit={selectedResult} onClose={() => setSelectedResult(null)} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
        <TopRightControls
          language={language}
          onToggleLanguage={toggleLanguage}
          colorScheme={colorScheme}
          onToggleColorScheme={toggleColorScheme}
          theme={theme}
          onInfoPress={() => { Keyboard.dismiss(); setSettingsVisible(false); setInfoVisible(true); }}
          onSettingsPress={() => { Keyboard.dismiss(); setInfoVisible(false); setSettingsVisible(true); }}
          indexStatus={searchStatus === 'ready' ? (isSemanticLoading ? 'loading' : (isSemanticReady ? 'ready' : 'idle')) : searchStatus}
          country={AVAILABLE_COUNTRIES.find(c => c.code === countryFilter)}
        />
        <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

        <View style={[styles.container, { paddingHorizontal: paddingH }]}>
          <SearchInsight debug={debug} theme={theme} />
          <FlatList
            ref={flatListRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ChatMessageBubble message={item} bubbleMaxWidth={bubbleMaxWidth} theme={theme} colorScheme={colorScheme} onViewDetails={setSelectedResult} />}
          />
          <View style={styles.inputArea}>
            {showSuggestions && <SuggestionsList results={liveResults} isSearching={isSearching} isStale={isStaleResults} maxHeight={suggestionsMaxHeight} theme={theme} language={language} onSelect={handleSelectResult} />}
            <ChatInput value={inputText} placeholder={STRINGS[language].chatPlaceholder} isSearching={isSearching} showSuggestions={showSuggestions} paddingV={inputPaddingV} theme={theme} onChangeText={handleInputChange} onSubmit={() => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); if (shouldTriggerSearch(trimmedQuery.length, minQueryLength) && liveResults.length === 0) performSearch(trimmedQuery); }} onFocus={handleFocus} />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingTop: 96, paddingBottom: 16 },
  list: { flex: 1 },
  listContent: { paddingTop: 116, paddingBottom: 8 },
  inputArea: { paddingTop: 8 },
});
