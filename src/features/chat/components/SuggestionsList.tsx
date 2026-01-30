import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SearchResult } from '../../search/types';
import type { AppTheme } from '../../../constants/theme';

type Props = {
  results: SearchResult[];
  isSearching: boolean;
  isStale: boolean;
  maxHeight: number;
  theme: AppTheme;
  language: 'pl' | 'en';
  onSelect: (result: SearchResult) => void;
};

export function SuggestionsList({ results, isSearching, isStale, maxHeight, theme, language, onSelect }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, maxHeight }]}>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {results.map((result) => (
          <SuggestionItem
            key={result.id}
            result={result}
            isStale={isStale}
            theme={theme}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
      {isSearching && <LoadingOverlay theme={theme} language={language} />}
    </View>
  );
}

function SuggestionItem({
  result,
  isStale,
  theme,
  onSelect,
}: {
  result: SearchResult;
  isStale: boolean;
  theme: AppTheme;
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(result)}
      disabled={isStale}
      style={({ pressed }) => [
        styles.item,
        { borderBottomColor: theme.colors.borderSubtle },
        pressed && !isStale && { backgroundColor: theme.colors.primaryMuted },
        isStale && { opacity: 0.55 },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {result.title}
        </Text>
        <Text style={[styles.preview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {result.content}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
          {result.doc_title} • str. {result.page} • {result.lang.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.score, { backgroundColor: theme.colors.accentMuted }]}>
        <Text style={[styles.scoreText, { color: theme.colors.accent }]}>
          {(result.score * 100).toFixed(0)}%
        </Text>
      </View>
    </Pressable>
  );
}

function LoadingOverlay({ theme, language }: { theme: AppTheme; language: 'pl' | 'en' }) {
  return (
    <View style={[styles.loadingOverlay, { borderColor: theme.colors.borderSubtle }]}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
        {language === 'pl' ? 'Aktualizuję…' : 'Updating…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  list: { maxHeight: 300 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  preview: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 11, marginTop: 2 },
  score: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  scoreText: { fontSize: 12, fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.25)',
  },
  loadingText: { fontSize: 14 },
});
