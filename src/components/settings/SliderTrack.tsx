import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';

type Props = {
  values: number[];
  currentValue: number;
  onSelect: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
  theme: AppTheme;
};

export function SliderTrack({ values, currentValue, onSelect, leftLabel, rightLabel, theme }: Props) {
  const currentIndex = values.findIndex(v => Math.abs(v - currentValue) < 0.01);
  const progress = currentIndex / (values.length - 1);

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: theme.colors.textTertiary }]}>{leftLabel}</Text>
        <Text style={[styles.value, { color: theme.colors.accent }]}>{Math.round(currentValue * 100)}%</Text>
        <Text style={[styles.label, { color: theme.colors.textTertiary }]}>{rightLabel}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceElevated }]}>
        <View style={[styles.fill, { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }]} />
        {values.map((value, index) => {
          const isActive = Math.abs(currentValue - value) < 0.01;
          const left = (index / (values.length - 1)) * 100;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              style={[
                styles.dot,
                { left: `${left}%`, backgroundColor: index <= currentIndex ? theme.colors.primary : theme.colors.border },
                isActive && { transform: [{ scale: 1.4 }], backgroundColor: theme.colors.accent, shadowColor: theme.colors.glowAccent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 6 },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '700', letterSpacing: -0.5 },
  track: { height: 6, borderRadius: 3, position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  dot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: -5, marginLeft: -8 },
});
