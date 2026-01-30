/**
 * Keywords display component
 * Renders list of keyword chips
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  keywords: string[];
  label: string;
  theme: {
    colors: {
      textTertiary: string;
      textPrimary: string;
      surfaceElevated: string;
    };
  };
}

export function KeywordChips({ keywords, label, theme }: Props) {
  if (!keywords?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: theme.colors.textTertiary + '80' }]}>
        {label}
      </Text>
      <View style={styles.list}>
        {keywords.map((kw, idx) => (
          <View
            key={idx}
            style={[styles.chip, { backgroundColor: theme.colors.surfaceElevated + '60' }]}
          >
            <Text style={[styles.chipText, { color: theme.colors.textTertiary }]}>
              {kw}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '400',
  },
});
