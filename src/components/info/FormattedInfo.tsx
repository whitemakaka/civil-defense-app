import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

type Props = { text: string; theme: AppTheme };

export function FormattedInfo({ text, theme }: Props) {
  const sections = useMemo(() => {
    return text.split('\n\n').map((part, idx) => {
      const lines = part.split('\n');
      const firstLine = lines[0];
      const isHeader = firstLine.endsWith(':') && !firstLine.startsWith('•');

      return (
        <View key={idx} style={idx > 0 ? styles.block : undefined}>
          {isHeader && <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{firstLine}</Text>}
          {(isHeader ? lines.slice(1) : lines).map((line, i) => (
            <Text key={i} style={[styles.body, { color: theme.colors.textSecondary }]}>{line}</Text>
          ))}
        </View>
      );
    });
  }, [text, theme]);

  return <>{sections}</>;
}

const styles = StyleSheet.create({
  block: { marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.3)' },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 13, lineHeight: 20 },
});
