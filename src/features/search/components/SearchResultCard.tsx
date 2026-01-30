import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import type { SearchResult } from '../types';
import type { AppTheme } from '../../../constants/theme';
import { formatQuoteText } from '../utils/displayText';

interface Props {
  result: SearchResult;
  theme: AppTheme;
  onPress: () => void;
}

export function SearchResultCard({ result, theme, onPress }: Props) {
  // Responsive values
  const cardPadding = useResponsiveValue({ base: 14, md: 18, lg: 20 });
  const titleFontSize = useResponsiveValue({ base: 15, md: 17, lg: 18 });
  const contentFontSize = useResponsiveValue({ base: 13, md: 14, lg: 15 });
  const metaFontSize = useResponsiveValue({ base: 11, md: 12, lg: 13 });
  const contentPreviewLength = useResponsiveValue({ base: 120, md: 180, lg: 220 });

  const normalized = formatQuoteText(result.content);
  const contentPreview = normalized.length > contentPreviewLength
    ? normalized.slice(0, contentPreviewLength) + '...'
    : normalized;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: theme.colors.surface, 
          borderColor: theme.colors.border,
          padding: cardPadding,
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <Text 
          style={[styles.title, { color: theme.colors.textPrimary, fontSize: titleFontSize }]} 
          numberOfLines={2}
        >
          {result.title}
        </Text>
        <View style={[styles.langBadge, { backgroundColor: theme.colors.primaryMuted }]}>
          <Text style={[styles.langText, { color: theme.colors.primary }]}>
            {result.lang.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text 
        style={[styles.content, { color: theme.colors.textSecondary, fontSize: contentFontSize }]} 
        numberOfLines={3}
      >
        {contentPreview}
      </Text>
      
      <View style={styles.meta}>
        <Text 
          style={[styles.metaText, { color: theme.colors.textTertiary, fontSize: metaFontSize }]} 
          numberOfLines={1}
        >
          {result.doc_title} • str. {result.page}
        </Text>
        <View style={[styles.scoreBadge, { backgroundColor: theme.colors.accentMuted }]}>
          <Text style={[styles.scoreText, { color: theme.colors.accent, fontSize: metaFontSize }]}>
            {(result.score * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 24,
  },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    lineHeight: 22,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  metaText: {
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontWeight: '700',
  },
});
