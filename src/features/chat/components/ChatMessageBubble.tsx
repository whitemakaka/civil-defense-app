import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, Clipboard, Platform, ToastAndroid } from 'react-native';
import type { SearchResult } from '../../search/types';
import type { AppTheme } from '../../../constants/theme';

const avatarDark = require('../../../../assets/images/avatar_dark_mode.png');
const avatarLight = require('../../../../assets/images/avatar_light_mode.png');

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
  colorScheme: 'light' | 'dark';
  onViewDetails?: (result: SearchResult) => void;
};

export function ChatMessageBubble({ message, bubbleMaxWidth, theme, colorScheme, onViewDetails }: Props) {
  const isUser = message.role === 'user';

  const handleCopy = () => {
    if (!message.text) return;
    Clipboard.setString(message.text);
    if (Platform.OS === 'android') ToastAndroid.show('✓ Copied', ToastAndroid.SHORT);
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && <Avatar colorScheme={colorScheme} theme={theme} />}
      <View style={styles.content}>
        {message.text && (
          <Pressable
            onLongPress={handleCopy}
            style={[
              styles.bubble,
              { maxWidth: bubbleMaxWidth, backgroundColor: isUser ? theme.colors.primary : theme.colors.surface },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isUser ? theme.colors.primaryText : theme.colors.textPrimary }]}>
              {message.text}
            </Text>
          </Pressable>
        )}
        {message.result && onViewDetails && (
          <ResultMeta result={message.result} theme={theme} onPress={() => onViewDetails(message.result!)} />
        )}
      </View>
    </View>
  );
}

function Avatar({ colorScheme, theme }: { colorScheme: 'light' | 'dark'; theme: AppTheme }) {
  return (
    <View style={[styles.avatar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Image source={colorScheme === 'dark' ? avatarDark : avatarLight} style={styles.avatarImage} resizeMode="contain" />
    </View>
  );
}

function ResultMeta({ result, theme, onPress }: { result: SearchResult; theme: AppTheme; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.meta, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
          {result.doc_title} • str. {result.page} • {result.lang.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 4, alignItems: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  content: { flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, marginRight: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 70, height: 70, marginTop: 6 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  meta: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  metaText: { fontSize: 11 },
});
