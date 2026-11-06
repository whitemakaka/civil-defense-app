import React, { useEffect, useRef } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIUS, type AppTheme, type ColorScheme } from '../constants/theme';
import { STRINGS, type Language } from '../constants/strings';

type IndexStatus = 'idle' | 'loading' | 'searching' | 'ready' | 'error';

type Props = {
  language: Language;
  onToggleLanguage: () => void;
  colorScheme: ColorScheme;
  onToggleColorScheme: () => void;
  theme: AppTheme;
  onInfoPress?: () => void;
  variant?: 'solid' | 'transparent';
  indexStatus?: IndexStatus;
};

// Status indicator component
function StatusIndicator({
  status,
  theme,
  language,
}: {
  status: IndexStatus;
  theme: AppTheme;
  language: Language;
}) {
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
      case 'ready': return theme.colors.success;
      case 'error': return theme.colors.danger;
      default: return theme.colors.muted;
    }
  };
  
  const a11yLabel = STRINGS[language].a11yStatus[status];

  if (status === 'loading' || status === 'searching') {
    return (
      <Animated.View
        accessible
        accessibilityLabel={a11yLabel}
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
    <View
      accessible
      accessibilityLabel={a11yLabel}
      style={[styles.statusDot, { backgroundColor: getColor() }]}
    />
  );
}

export function TopRightControls({
  language,
  onToggleLanguage,
  colorScheme,
  onToggleColorScheme,
  theme,
  onInfoPress,
  variant = 'solid',
  indexStatus = 'idle',
}: Props) {
  const isTransparent = variant === 'transparent';
  const strings = STRINGS[language];

  // Opens the phone dialer with 112 pre-filled (ACTION_DIAL: no permission, no internet).
  // canOpenURL is intentionally not used: on Android 11+ it needs a <queries> manifest entry.
  const handleEmergencyPress = async () => {
    try {
      await Linking.openURL('tel:112');
    } catch {
      Alert.alert(strings.emergencyCallError);
    }
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isTransparent ? 'transparent' : theme.colors.background,
        },
      ]}
    >
      <View style={styles.outerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.emergencyA11y}
          hitSlop={4}
          onPress={handleEmergencyPress}
          style={({ pressed }) => [
            styles.emergencyPill,
            { backgroundColor: theme.colors.emergency },
            pressed && styles.pillPressed,
          ]}
        >
          <MaterialCommunityIcons name="phone" size={16} color={theme.colors.emergencyText} />
          <Text style={[styles.emergencyText, { color: theme.colors.emergencyText }]}>
            {strings.emergencyLabel}
          </Text>
        </Pressable>

        <View style={styles.row}>
          {/* Status indicator */}
          <StatusIndicator status={indexStatus} theme={theme} language={language} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.a11yToggleLanguage}
            hitSlop={6}
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
            accessibilityLabel={strings.a11yToggleTheme}
            hitSlop={6}
            onPress={onToggleColorScheme}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              pressed && styles.pillPressed,
            ]}
          >
            <MaterialCommunityIcons
              name={colorScheme === 'dark' ? 'white-balance-sunny' : 'weather-night'}
              size={20}
              color={theme.colors.textPrimary}
            />
          </Pressable>
          {onInfoPress && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.a11yInfo}
              hitSlop={6}
              onPress={onInfoPress}
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                pressed && styles.pillPressed,
              ]}
            >
              <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 14,
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
