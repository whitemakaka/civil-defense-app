/**
 * Search result detail screen
 * Displays full content of a search result
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Clipboard,
  Platform,
  ToastAndroid,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../../../stores/settings/settingsStore';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import { firstNonEmpty, looksLikeTechnicalId } from '../../../shared/lib/strings';
import { toPercent } from '../utils/scoreConversion';
import { resolveDocTitle } from '../utils/documentTitles';
import { ScoreBar } from '../ui/components/ScoreBar';
import { MetaChip } from '../ui/components/MetaChip';
import { KeywordChips } from '../ui/components/KeywordChips';
import type { SearchResult } from '../types';
import { formatMetaValue, formatQuoteText } from '../utils/displayText';

interface Props {
  hit: SearchResult;
  onClose: () => void;
}

export function SearchDetailScreen({ hit, onClose }: Props) {
  const { language, colorScheme, theme } = useSettings();
  const androidTopInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  // Responsive values
  const containerMaxWidth = useResponsiveValue<number | `${number}%`>({
    base: '100%',
    md: 680,
    lg: 720,
    xl: 760,
  });
  const contentPadding = useResponsiveValue({ base: 16, md: 20, lg: 24 });
  const titleFontSize = useResponsiveValue({ base: 17, md: 18, lg: 19 });
  const contentFontSize = useResponsiveValue({ base: 15, md: 16, lg: 16 });

  // Resolve display values
  const title = firstNonEmpty(hit.title, hit.title_clean);
  const contentRaw = firstNonEmpty(hit.content_clean, hit.content);
  const content = formatQuoteText(contentRaw);
  const docId = firstNonEmpty(hit.doc_stem, hit.document, hit.document_id, hit.source);
  const docTitleRaw = firstNonEmpty(hit.doc_title, hit.document_title, hit.documentName);
  const docDisplay = looksLikeTechnicalId(docTitleRaw || docId)
    ? resolveDocTitle(docId, String(hit.lang ?? 'pl'))
    : docTitleRaw || docId;
  const chapterRaw = firstNonEmpty(hit.chapter_title, hit.chapter, hit.section);
  const chapter = chapterRaw ? formatMetaValue(chapterRaw) : undefined;
  const page = hit.page ?? hit.page_number ?? hit.pageNumber;
  const scorePercent = toPercent({ score: hit.score, distance: hit.distance });

  const handleCopy = () => {
    Clipboard.setString(content);
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        language === 'pl' ? '✓ Skopiowano' : '✓ Copied',
        ToastAndroid.SHORT
      );
    }
  };

  const labels = {
    back: language === 'pl' ? 'Wróć' : 'Back',
    copy: language === 'pl' ? 'Kopiuj' : 'Copy',
    document: language === 'pl' ? 'Dokument' : 'Document',
    page: language === 'pl' ? 'Strona' : 'Page',
    chapter: language === 'pl' ? 'Rozdział' : 'Chapter',
    source: language === 'pl' ? 'Źródło' : 'Source',
    keywords: language === 'pl' ? 'SŁOWA KLUCZOWE' : 'KEYWORDS',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />

      {/* Header */}
      <View style={[styles.headerWrapper, { maxWidth: containerMaxWidth, paddingTop: androidTopInset }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.headerBtnText, { color: theme.colors.primary }]}>
              ← {labels.back}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.headerBtnText, { color: theme.colors.primary }]}>
              ⧉ {labels.copy}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.contentWrapper,
            { maxWidth: containerMaxWidth, paddingHorizontal: contentPadding },
          ]}
        >
          {/* Top row: Badge + Score */}
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryMuted }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {String(hit.lang ?? '').toUpperCase()}
              </Text>
            </View>
            <ScoreBar percent={scorePercent} theme={theme} />
          </View>

          {/* Title - treated as metadata label */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.textSecondary, fontSize: titleFontSize },
            ]}
          >
            {title}
          </Text>

          {/* Content - primary focus, but calm */}
          <Text
            style={[
              styles.content,
              { color: theme.colors.textPrimary + 'E8', fontSize: contentFontSize },
            ]}
          >
            {content}
          </Text>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            {docDisplay && <MetaChip label={labels.document} value={docDisplay} theme={theme} />}
            {page && <MetaChip label={labels.page} value={page} theme={theme} />}
            {chapter && <MetaChip label={labels.chapter} value={chapter} theme={theme} />}
          </View>

          {/* Keywords */}
          <KeywordChips
            keywords={hit.keywords}
            label={labels.keywords}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerWrapper: {
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  contentWrapper: {
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 12,
    letterSpacing: 0,
  },
  content: {
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
});
