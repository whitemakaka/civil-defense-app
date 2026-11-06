import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIUS } from '../../constants/theme';
import type { AppTheme } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import type { Manifest } from '../../features/search/types';

type Props = { manifest: Manifest | null; theme: AppTheme; language: 'pl' | 'en' };

export function EmbeddingInfo({ manifest, theme, language }: Props) {
  if (!manifest) {
    return (
      <View style={styles.box}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {language === 'pl' ? 'Bundle nie załadowany' : 'Bundle not loaded'}
        </Text>
      </View>
    );
  }

  const embeddingTypeLabel =
    `${manifest.embeddings_dtype} (${manifest.embeddings_quantization})`;

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
      <View style={[styles.badge, { backgroundColor: theme.colors.successMuted }]}>
        <MaterialCommunityIcons name="check-circle" size={14} color={theme.colors.success} />
        <Text style={[styles.badgeText, { color: theme.colors.success }]}>
          {language === 'pl' ? 'Gotowy offline' : 'Offline ready'}
        </Text>
      </View>
      <CopyableModel label={language === 'pl' ? 'Model:' : 'Model:'} value={manifest.model_id} color={theme.colors.success} theme={theme} language={language} />
      <InfoRow label={language === 'pl' ? 'Wymiar:' : 'Dimension:'} value={String(manifest.dim)} color={theme.colors.accent} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Typ danych:' : 'Data type:'} value={embeddingTypeLabel} color={theme.colors.textPrimary} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Notki:' : 'Notes:'} value={manifest.note_count.toLocaleString()} color={theme.colors.accent} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Wektory lokalne:' : 'Local vectors:'} value={manifest.local_vector_count.toLocaleString()} color={theme.colors.textPrimary} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Wektory globalne:' : 'Global vectors:'} value={manifest.global_vector_count.toLocaleString()} color={theme.colors.textPrimary} theme={theme} />
    </View>
  );
}

function InfoRow({ label, value, color, theme }: { label: string; value: string; color: string; theme: AppTheme }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

function CopyableModel({ label, value, color, theme, language }: { label: string; value: string; color: string; theme: AppTheme; language: 'pl' | 'en' }) {
  const [copied, setCopied] = useState(false);
  const parts = value.split('/');
  const shortName = parts[parts.length - 1];
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await setStringAsync(value);
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null;
      setCopied(false);
    }, 2000);
  }, [value]);

  return (
    <View style={styles.modelRow}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={STRINGS[language].copy}
        hitSlop={4}
        style={({ pressed }) => [styles.copyRow, pressed && { opacity: 0.6 }]}
      >
        <Text style={[styles.modelValue, { color }]}>{shortName}</Text>
        <MaterialCommunityIcons
          name={copied ? 'check' : 'content-copy'}
          size={18}
          color={copied ? theme.colors.primary : theme.colors.textTertiary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: RADIUS.sm, padding: 12, borderWidth: 1, gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modelRow: { gap: 4 },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '600', fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  modelValue: { fontSize: 13, fontWeight: '600', fontFamily: 'monospace', flex: 1 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minHeight: 44 },
});
