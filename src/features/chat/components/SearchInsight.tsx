import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DebugInfo } from '../../search/hooks/useSemanticSearch';
import type { AppTheme } from '../../../constants/theme';

type Props = {
  debug: DebugInfo | null;
  theme: AppTheme;
};

export function SearchInsight({ debug, theme }: Props) {
  if (!__DEV__ || !debug) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.scoresRow}>
        <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
          LOCAL {(debug.avgLocalScore * 100).toFixed(0)}
        </Text>
        <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
          GLOBAL {(debug.avgGlobalScore * 100).toFixed(0)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 10 },
  scoreLabel: { fontSize: 11, fontWeight: '600', minWidth: 52 },
  scoresRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
