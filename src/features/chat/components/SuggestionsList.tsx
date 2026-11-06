import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SearchResult } from '../../search/types';
import { RADIUS, type AppTheme } from '../../../constants/theme';
import { STRINGS, formatPointCount, formatResultCount } from '../../../constants/strings';

type Props = {
  results: SearchResult[];
  isSearching: boolean;
  isStale: boolean;
  theme: AppTheme;
  language: 'pl' | 'en';
  onSelect: (result: SearchResult) => void;
};

export function SuggestionsList({ results, isSearching, isStale, theme, language, onSelect }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Text
          style={[styles.headerText, { color: theme.colors.textSecondary }]}
          accessibilityLiveRegion="polite"
        >
          {formatResultCount(results.length, language)}
        </Text>
        {isSearching && <LoadingIndicator theme={theme} language={language} />}
      </View>
      {results.map((result, index) => (
        <SuggestionItem
          key={result.id}
          result={result}
          isBest={index === 0}
          isStale={isStale}
          theme={theme}
          language={language}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

function SuggestionItem({
  result,
  isBest,
  isStale,
  theme,
  language,
  onSelect,
}: {
  result: SearchResult;
  isBest: boolean;
  isStale: boolean;
  theme: AppTheme;
  language: 'pl' | 'en';
  onSelect: (result: SearchResult) => void;
}) {
  const title = result.subtopic || result.topic;
  const preview = result.note[result.matchedLineIndex] ?? '';
  const strings = STRINGS[language];
  return (
    <Pressable
      onPress={() => onSelect(result)}
      disabled={isStale}
      accessibilityRole="button"
      accessibilityState={{ disabled: isStale }}
      accessibilityLabel={[title, preview, strings.a11yOpenNote]
        .map(part => part.trim().replace(/[.!?…]+$/, ''))
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [
        styles.item,
        { borderBottomColor: theme.colors.borderSubtle },
        isBest && [styles.bestItem, { borderLeftColor: theme.colors.primary }],
        pressed && !isStale && { backgroundColor: theme.colors.primaryMuted },
        isStale && { opacity: 0.55 },
      ]}
    >
      <View style={styles.content}>
        {isBest && (
          <View style={[styles.bestChip, { backgroundColor: theme.colors.primaryMuted }]}>
            <Text style={[styles.bestChipText, { color: theme.colors.primary }]}>{strings.bestMatch}</Text>
          </View>
        )}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.preview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {preview}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
          {`${strings.fullNote} · ${formatPointCount(result.note.length, language)}`}
        </Text>
      </View>
    </Pressable>
  );
}

function LoadingIndicator({ theme, language }: { theme: AppTheme; language: 'pl' | 'en' }) {
  return (
    <View
      style={[
        styles.loadingIndicator,
        { borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surfaceElevated },
      ]}
    >
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
        {STRINGS[language].updating}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flexShrink: 1, fontSize: 12, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 48, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  // 3 px accent border; padding reduced by the same amount so text stays aligned with other items.
  bestItem: { borderLeftWidth: 3, paddingLeft: 11 },
  bestChip: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  bestChipText: { fontSize: 12, fontWeight: '700' },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  preview: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 12, marginTop: 2 },
  loadingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
  },
  loadingText: { fontSize: 13 },
});
