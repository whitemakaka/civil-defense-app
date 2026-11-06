import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import { useSettings } from '../../../stores/settings/settingsStore';
import { useSearchSettings } from '../../../stores/settings/searchSettingsStore';
import { STRINGS } from '../../../constants/strings';
import { TopRightControls } from '../../../components/TopRightControls';
import { InfoModal } from '../../../components/InfoModal';
import { formatNoteText } from '../../search/utils/displayText';
import type { SearchConfig, SearchResult } from '../../search/types';
import { SearchInsight, SuggestionsList, ChatInput, ChatMessageBubble, type ChatMessage } from '../components';
import { useChatSearch } from '../hooks/useChatSearch';

const WELCOME_ID = 'welcome-assistant';

export default function ChatScreen() {
  const { theme } = useSettings();
  const { bundleConfigReady, searchConfig, configurationError } = useSearchSettings();
  if (!bundleConfigReady) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}><View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.primary} /></View></SafeAreaView>;
  }
  if (configurationError !== null || searchConfig === null) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}><View style={styles.loading}><Text style={{ color: theme.colors.warning }}>{configurationError}</Text></View></SafeAreaView>;
  }
  return <ConfiguredChatScreen searchConfig={searchConfig} />;
}

function ConfiguredChatScreen({ searchConfig }: { searchConfig: SearchConfig }) {
  const { language, colorScheme, theme, toggleColorScheme, toggleLanguage } = useSettings();
  const {
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
  } = useChatSearch({ searchConfig, language });
  const paddingH = useResponsiveValue<number>({ base: 12, sm: 16, md: 20, lg: 28, xl: 40 });
  const bubbleMaxWidth = useResponsiveValue({ base: '85%', md: '80%', lg: '72%', xl: '66%' }) as `${number}%`;
  const inputPaddingV = useResponsiveValue<number>({ base: 10, md: 12, lg: 14 });
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetsRef = useRef(new Map<string, number>());
  const pendingScrollTargetRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: WELCOME_ID, role: 'assistant', text: STRINGS[language].welcomeChat }]);
  const [infoVisible, setInfoVisible] = useState(false);

  const showSuggestions = results.length > 0;

  const scrollToPendingTarget = useCallback(() => {
    if (pendingScrollTargetRef.current === null) return;
    requestAnimationFrame(() => {
      const target = pendingScrollTargetRef.current;
      if (target === null) return;
      const offset = scrollOffsetsRef.current.get(target);
      if (offset === undefined) return;
      scrollRef.current?.scrollTo({ y: offset, animated: false });
      pendingScrollTargetRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      pendingScrollTargetRef.current = 'suggestions';
      scrollToPendingTarget();
    }
  }, [showSuggestions, results, scrollToPendingTarget]);
  useEffect(() => {
    setMessages(previousMessages =>
      previousMessages.map(message => {
        if (message.id === WELCOME_ID) return { ...message, text: STRINGS[language].welcomeChat };
        if (message.role !== 'assistant' || !message.result) return message;
        const result = localizeResult(message.result, language);
        return { ...message, text: formatNoteText(result.note), result };
      }),
    );
  }, [language, localizeResult]);

  const handleSelectResult = useCallback((selected: SearchResult) => {
    const { query, result } = takeResult(selected);
    const timestamp = Date.now();
    pendingScrollTargetRef.current = `user-${timestamp}`;
    setMessages(prev => [...prev, { id: `user-${timestamp}`, role: 'user', text: query }, { id: `assistant-${timestamp}`, role: 'assistant', text: formatNoteText(result.note), result }]);
  }, [takeResult]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
        <TopRightControls
          language={language}
          onToggleLanguage={toggleLanguage}
          colorScheme={colorScheme}
          onToggleColorScheme={toggleColorScheme}
          theme={theme}
          onInfoPress={() => { Keyboard.dismiss(); setInfoVisible(true); }}
          indexStatus={indexStatus}
        />
        <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />

        <View style={[styles.container, { paddingHorizontal: paddingH }]}>
          <ScrollView
            ref={scrollRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToPendingTarget}
            onLayout={() => {
              if (showSuggestions) {
                pendingScrollTargetRef.current = 'suggestions';
                scrollToPendingTarget();
              }
            }}
          >
            {messages.map(message => (
              <View key={message.id} onLayout={event => {
                scrollOffsetsRef.current.set(message.id, event.nativeEvent.layout.y);
                scrollToPendingTarget();
              }}>
                <ChatMessageBubble message={message} bubbleMaxWidth={bubbleMaxWidth} theme={theme} language={language} />
              </View>
            ))}
            <View onLayout={event => {
              scrollOffsetsRef.current.set('suggestions', event.nativeEvent.layout.y);
              scrollToPendingTarget();
            }}>
              <SearchInsight debug={debug} theme={theme} />
              {errorText !== null && <Text style={[styles.status, { color: theme.colors.warning }]}>{errorText}</Text>}
              {showSuggestions && <SuggestionsList results={results} isSearching={isSearching} isStale={isStale} theme={theme} language={language} onSelect={handleSelectResult} />}
              {noMatch && <Text style={[styles.status, { color: theme.colors.textSecondary }]}>{STRINGS[language].noResults}</Text>}
            </View>
          </ScrollView>
          <View style={styles.inputArea}>
            <ChatInput value={inputText} placeholder={STRINGS[language].chatPlaceholder} isSearching={isSearching} showSuggestions={showSuggestions} paddingV={inputPaddingV} theme={theme} onChangeText={onChangeText} onSubmit={onSubmit} onFocus={onFocus} />
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
  container: { flex: 1, minHeight: 0 },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: 8 },
  inputArea: { flexShrink: 0, paddingVertical: 8 },
  status: { fontSize: 13, paddingVertical: 4 },
});
