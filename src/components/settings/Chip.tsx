import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AppTheme } from '../../constants/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: AppTheme;
  compact?: boolean;
};

export function Chip({ label, selected, onPress, theme, compact = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compact,
        { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceElevated, borderColor: selected ? theme.colors.primary : theme.colors.border },
        selected && { shadowColor: theme.colors.glowPrimary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 8 },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, compact && styles.textCompact, { color: selected ? theme.colors.primaryText : theme.colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  compact: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  text: { fontSize: 14, fontWeight: '600' },
  textCompact: { fontSize: 13 },
});
