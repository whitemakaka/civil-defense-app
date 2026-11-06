import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, Share, ToastAndroid } from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NoteSource, SearchResult } from '../../search/types';
import { RADIUS, type AppTheme } from '../../../constants/theme';
import sourceGroups from '../../../config/sourceGroups.json';
import { STRINGS, type Language } from '../../../constants/strings';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: SearchResult;
};

type Props = {
  message: ChatMessage;
  bubbleMaxWidth: `${number}%`;
  theme: AppTheme;
  language?: Language;
};

function formatSourceName(source: NoteSource, language: SearchResult['lang']): string {
  const matching = sourceGroups.filter(group =>
    (group.sourceIds as readonly string[]).includes(source.source),
  );
  if (matching.length !== 1) throw new Error(`Source ${source.source} has no unique organization`);
  const group = matching[0];
  const publisher = group.detailByCountry
    ? source.country
    : `${group.label[language]} · ${source.country}`;
  if (!source.url) return publisher;
  const host = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(source.url)?.[1];
  if (!host) throw new Error(`Invalid source URL for ${source.source}`);
  return `${publisher} · ${host}`;
}

function formatPageRanges(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const page = sorted[i];
    if (page === end + 1) {
      end = page;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    start = page;
    end = page;
  }
  return ranges.join(', ');
}

function formatSourceLabel(source: NoteSource, language: SearchResult['lang']): string {
  const name = formatSourceName(source, language);
  if (source.pages.length === 0) return name;
  return `${name} · ${STRINGS[language].pagesAbbrev} ${formatPageRanges(source.pages)}`;
}

export function ChatMessageBubble({ message, bubbleMaxWidth, theme, language: uiLanguage }: Props) {
  const isUser = message.role === 'user';
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const language = message.result?.lang ?? uiLanguage ?? 'pl';
  const textColor = isUser ? theme.colors.primaryText : theme.colors.textPrimary;

  const handleCopy = () => {
    if (!message.text) return;
    setStringAsync(message.text)
      .then(() => {
        if (Platform.OS === 'android') ToastAndroid.show(STRINGS[language].copied, ToastAndroid.SHORT);
      })
      .catch(() => {});
  };

  const handleShare = async () => {
    if (!message.result) return;
    const title = message.result.subtopic || message.result.topic;
    try {
      await Share.share({ message: `${title}\n\n${message.text}\n\n— ${STRINGS[language].sharedFrom}` });
    } catch {
      // Ignore: the user dismissed the sheet or sharing is unavailable.
    }
  };

  const actionStyle = [styles.actionButton, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }];
  const actionTextStyle = [styles.actionText, { color: theme.colors.textSecondary }];

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={styles.content}>
        {message.text && (
          <Pressable
            onLongPress={handleCopy}
            style={[
              styles.bubble,
              isUser ? { maxWidth: bubbleMaxWidth } : styles.fullWidthBubble,
              { backgroundColor: isUser ? theme.colors.primary : theme.colors.surface },
            ]}
          >
            {!isUser && message.result && (
              <Text
                accessibilityRole="header"
                style={[styles.bubbleText, styles.bubbleTitle, { color: theme.colors.textPrimary, marginBottom: styles.bubble.marginBottom }]}
              >
                {message.result.subtopic || message.result.topic}
              </Text>
            )}
            {message.result ? (
              <View style={styles.noteList}>
                {message.result.note.map((line, index) => (
                  <View key={index} style={styles.noteRow}>
                    <Text style={[styles.bubbleText, styles.noteBullet, { color: textColor }]}>•</Text>
                    <Text style={[styles.bubbleText, styles.noteLine, { color: textColor }]}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.bubbleText, { color: textColor }]}>
                {message.text}
              </Text>
            )}
          </Pressable>
        )}
        {message.result && (
          <View style={styles.sourcesBox}>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={STRINGS[language].copy}
                hitSlop={4}
                onPress={handleCopy}
                style={actionStyle}
              >
                <MaterialCommunityIcons name="content-copy" size={18} color={theme.colors.textSecondary} />
                <Text style={actionTextStyle}>{STRINGS[language].copy}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={STRINGS[language].share}
                hitSlop={4}
                onPress={handleShare}
                style={actionStyle}
              >
                <MaterialCommunityIcons name="share-variant" size={18} color={theme.colors.textSecondary} />
                <Text style={actionTextStyle}>{STRINGS[language].share}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={STRINGS[language].sourcesHeading}
                accessibilityState={{ expanded: sourcesExpanded }}
                hitSlop={4}
                onPress={() => setSourcesExpanded(current => !current)}
                style={actionStyle}
              >
                <Text style={actionTextStyle}>{STRINGS[language].sourcesHeading}</Text>
                <MaterialCommunityIcons
                  name={sourcesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
            {sourcesExpanded && (
              <View style={[styles.sourcesList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {message.result.sources.map(source => (
                  <View key={source.source} style={styles.sourceItem}>
                    <Text style={[styles.groupTitle, { color: theme.colors.textPrimary }]}>
                      {formatSourceLabel(source, language)}
                    </Text>
                    <Text style={[styles.sourceTitle, { color: theme.colors.textPrimary }]}>{source.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  content: { flex: 1 },
  bubble: { borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  // Assistant messages (welcome and notes) span the full width so their edges line up.
  fullWidthBubble: { width: '100%' },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  bubbleTitle: { fontWeight: '700' },
  noteList: { gap: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  noteBullet: { width: 16 },
  noteLine: { flex: 1 },
  sourcesBox: { alignSelf: 'stretch' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    padding: 12,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  sourcesList: { borderWidth: 1, borderRadius: RADIUS.sm, padding: 12, marginTop: 6, gap: 12 },
  groupTitle: { fontSize: 13, fontWeight: '700' },
  sourceItem: { gap: 3 },
  sourceTitle: { fontSize: 13 },
});
