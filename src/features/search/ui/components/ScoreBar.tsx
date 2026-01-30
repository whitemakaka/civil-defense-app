/**
 * Score visualization bar
 * Displays percentage score with filled bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  percent: number | null;
  theme: {
    colors: {
      border: string;
      accent: string;
    };
  };
}

export function ScoreBar({ percent, theme }: Props) {
  if (percent === null) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.barBg, { backgroundColor: theme.colors.border + '40' }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: theme.colors.accent + '90', width: `${percent}%` },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: theme.colors.accent + '90' }]}>
        {percent.toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
