import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

type Props = {
  icon: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  theme: AppTheme;
};

export function SectionCard({ icon, title, hint, children, theme }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.borderSubtle }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          {hint && <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>{hint}</Text>}
        </View>
      </View>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  icon: { fontSize: 20, marginTop: 1 },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  hint: { fontSize: 12, lineHeight: 16 },
});
