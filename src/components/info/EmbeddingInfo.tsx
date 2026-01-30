import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
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

  const { EMBEDDING_MODEL_ID, EMBEDDING_DIM } = require('../../features/search/config');
  const bundleModelId = (manifest.model_id ?? (manifest as any).model) as string | undefined;
  const modelMatch = bundleModelId === EMBEDDING_MODEL_ID;
  const dimMatch = manifest.dim === EMBEDDING_DIM;
  const isCompatible = modelMatch && dimMatch;
  const embeddingDtype = (manifest.embeddings_dtype ?? manifest.dtype) as string | undefined;
  const embeddingQuant = manifest.embeddings_quant as string | undefined;
  const embeddingTypeLabel = embeddingDtype ? `${embeddingDtype}${embeddingQuant ? ` (${embeddingQuant})` : ''}` : (manifest.dtype as unknown as string);

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
      <View style={[styles.badge, { backgroundColor: isCompatible ? theme.colors.successMuted : theme.colors.warningMuted }]}>
        <Text style={[styles.badgeText, { color: isCompatible ? theme.colors.success : theme.colors.warning }]}>
          {isCompatible ? '✓' : '⚠'} {language === 'pl' ? (isCompatible ? 'Zgodny' : 'Niezgodny') : (isCompatible ? 'Compatible' : 'Incompatible')}
        </Text>
      </View>
      <CopyableModel label={language === 'pl' ? 'Oczekiwany model:' : 'Expected model:'} value={EMBEDDING_MODEL_ID} color={theme.colors.textTertiary} theme={theme} language={language} />
      <CopyableModel label={language === 'pl' ? 'Model bundle:' : 'Bundle model:'} value={bundleModelId ?? 'unknown'} color={modelMatch ? theme.colors.success : theme.colors.warning} theme={theme} language={language} />
      <InfoRow label={language === 'pl' ? 'Wymiar:' : 'Dimension:'} value={`${manifest.dim}${!dimMatch ? ` (${language === 'pl' ? 'oczekiwano' : 'expected'} ${EMBEDDING_DIM})` : ''}`} color={dimMatch ? theme.colors.accent : theme.colors.warning} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Typ danych:' : 'Data type:'} value={embeddingTypeLabel} color={theme.colors.textPrimary} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Liczba rekordów:' : 'Record count:'} value={manifest.count.toLocaleString()} color={theme.colors.accent} theme={theme} />
      <InfoRow label={language === 'pl' ? 'Wersja:' : 'Version:'} value={manifest.schema_version} color={theme.colors.textPrimary} theme={theme} />
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
  const shortName = value.split('/').pop() || value;
  const handleCopy = useCallback(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, []);

  return (
    <View style={styles.modelRow}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Pressable onPress={handleCopy} style={({ pressed }) => [styles.copyRow, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.modelValue, { color }]}>{shortName}</Text>
        <Text style={[styles.copyIcon, { color: copied ? theme.colors.primary : theme.colors.textTertiary }]}>{copied ? '✓' : '⧉'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 10, padding: 12, borderWidth: 1, gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modelRow: { gap: 4 },
  label: { fontSize: 12, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '600', fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  modelValue: { fontSize: 10, fontWeight: '600', fontFamily: 'monospace', flex: 1 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  copyIcon: { fontSize: 14 },
});
