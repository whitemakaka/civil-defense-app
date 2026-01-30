import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

type Props = { label: string; url: string; theme: AppTheme; language: 'pl' | 'en' };

export function CopyableLink({ label, url, theme, language }: Props) {
  const [copied, setCopied] = useState(false);
  const displayUrl = url.replace(/^mailto:/i, '');

  const handleCopy = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <Pressable onPress={handleCopy} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.url, { color: theme.colors.textPrimary }]} numberOfLines={1}>{displayUrl}</Text>
      </View>
      {copied && (
        <Text style={[styles.copied, { color: theme.colors.primary }]}>
          {language === 'pl' ? '✓ Skopiowano' : '✓ Copied'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(128,128,128,0.1)' },
  pressed: { opacity: 0.7 },
  info: { flex: 1 },
  label: { fontSize: 11, marginBottom: 2 },
  url: { fontSize: 11, fontFamily: 'monospace' },
  copied: { fontSize: 12, fontWeight: '600' },
});
