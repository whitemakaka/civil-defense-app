import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, StatusBar, Animated, Easing } from 'react-native';
import type { AppTheme, ColorScheme } from '../constants/theme';
import type { Language } from '../constants/strings';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 24)
    : Platform.OS === 'ios'
    ? 44
    : 0;

const BAR_HEIGHT = STATUS_BAR_HEIGHT + 52;

type IndexStatus = 'idle' | 'loading' | 'searching' | 'ready' | 'error';

type CountryInfo = {
  code: string;
  flag: string;
};

type Props = {
  language: Language;
  onToggleLanguage: () => void;
  colorScheme: ColorScheme;
  onToggleColorScheme: () => void;
  theme: AppTheme;
  onSettingsPress?: () => void;
  onInfoPress?: () => void;
  variant?: 'solid' | 'transparent';
  indexStatus?: IndexStatus;
  country?: CountryInfo; // Current country filter
};

// Status indicator component
function StatusIndicator({ status, theme }: { status: IndexStatus; theme: AppTheme }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (status === 'loading' || status === 'searching') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [status, spinAnim]);
  
  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const getColor = () => {
    switch (status) {
      case 'loading': return theme.colors.primary;
      case 'searching': return theme.colors.primary;
      case 'ready': return '#22c55e'; // green
      case 'error': return '#ef4444'; // red
      default: return theme.colors.muted;
    }
  };
  
  if (status === 'loading' || status === 'searching') {
    return (
      <Animated.View
        style={[
          styles.statusDot,
          { 
            borderColor: getColor(),
            borderWidth: 2,
            borderTopColor: 'transparent',
            transform: [{ rotate: spinInterpolate }],
          },
        ]}
      />
    );
  }
  
  return (
    <View style={[styles.statusDot, { backgroundColor: getColor() }]} />
  );
}

export function TopRightControls({
  language,
  onToggleLanguage,
  colorScheme,
  onToggleColorScheme,
  theme,
  onSettingsPress,
  onInfoPress,
  variant = 'solid',
  indexStatus = 'idle',
  country,
}: Props) {
  const isTransparent = variant === 'transparent';

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isTransparent ? 'transparent' : theme.colors.background,
          height: BAR_HEIGHT,
        },
      ]}
    >
      <View style={[styles.row, { top: STATUS_BAR_HEIGHT + 8 }]}>
        {/* Status indicator */}
        <StatusIndicator status={indexStatus} theme={theme} />
        
        {/* Country indicator (static - no dropdown until more countries) */}
        {country && (
          <View
            style={[
              styles.countryPill,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <Text style={[styles.countryCode, { color: theme.colors.textSecondary }]}>
              {country.code}
            </Text>
          </View>
        )}
        
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle language"
          onPress={onToggleLanguage}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed && styles.pillPressed,
          ]}
        >
          <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>{language === 'pl' ? 'EN' : 'PL'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          onPress={onToggleColorScheme}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed && styles.pillPressed,
          ]}
        >
          <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>
            {colorScheme === 'dark' ? '☀︎' : '☽'}
          </Text>
        </Pressable>
        {onInfoPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Info"
            onPress={onInfoPress}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>ℹ</Text>
          </Pressable>
        )}
        {onSettingsPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onSettingsPress}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>⚙</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 300,
    elevation: 300,
  },
  row: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  countryFlag: {
    fontSize: 14,
  },
  countryCode: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
