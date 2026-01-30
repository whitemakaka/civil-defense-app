/**
 * Metadata chip component
 * Displays label + value pair
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  theme: {
    colors: {
      cardBg: string;
      textTertiary: string;
      textPrimary: string;
      textSecondary: string;
    };
  };
}

export function MetaChip({ label, value, theme }: Props) {
  if (!value) return null;

  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.cardBg + '80' }]}>
      <Text style={[styles.label, { color: theme.colors.textTertiary + '90' }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: theme.colors.textSecondary + 'CC' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    fontWeight: '500',
  },
});
