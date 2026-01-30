import React, { useMemo } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { STRINGS } from '../../../constants/strings';
import { useResponsiveValue } from '../../../hooks/useResponsive';
import { useSettings } from '../../../stores/settings/settingsStore';
import { TopRightControls } from '../../../components/TopRightControls';
import type { AppTheme } from '../../../constants/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoDark = require('../../../../assets/images/civil_defense_dark_mode.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoLight = require('../../../../assets/images/civil_defense_light_mode.png');

type WelcomeScreenProps = {
  onNext: () => void;
};

function FormattedBody({ text, theme, fontSize, lineHeight }: { text: string; theme: AppTheme; fontSize: number; lineHeight: number }) {
  const sections = useMemo(() => {
    const parts = text.split('\n\n');
    return parts.map((part, idx) => {
      const lines = part.split('\n');
      const firstLine = lines[0];
      const isHeader = firstLine.endsWith(':') && !firstLine.startsWith('-');
      
      if (isHeader) {
        return (
          <View key={idx} style={idx > 0 ? { marginTop: 16 } : undefined}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {firstLine}
            </Text>
            {lines.slice(1).map((line, lineIdx) => (
              <Text key={lineIdx} style={[styles.body, { fontSize, lineHeight, color: theme.colors.textPrimary }]}>
                {line}
              </Text>
            ))}
          </View>
        );
      }
      
      return (
        <View key={idx} style={idx > 0 ? { marginTop: 12 } : undefined}>
          {lines.map((line, lineIdx) => (
            <Text key={lineIdx} style={[styles.body, { fontSize, lineHeight, color: theme.colors.textPrimary }]}>
              {line}
            </Text>
          ))}
        </View>
      );
    });
  }, [text, theme, fontSize, lineHeight]);

  return <>{sections}</>;
}

export default function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const { language, colorScheme, theme, toggleColorScheme, toggleLanguage } = useSettings();
  const paddingH = useResponsiveValue<number>({ base: 16, sm: 20, md: 24, lg: 32, xl: 40 });
  const contentMaxW = useResponsiveValue<number>({ base: 720, md: 840, lg: 960, xl: 1040 });
  const logoSize = useResponsiveValue<number>({ base: 140, sm: 160, md: 180, lg: 200 });
  const bodySize = useResponsiveValue<number>({ base: 14, md: 16 });
  const bodyLH = useResponsiveValue<number>({ base: 22, md: 24, lg: 26 });

  const logo = colorScheme === 'dark' ? logoDark : logoLight;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <View style={styles.root}>
        <TopRightControls
          language={language}
          onToggleLanguage={toggleLanguage}
          colorScheme={colorScheme}
          onToggleColorScheme={toggleColorScheme}
          theme={theme}
          variant="transparent"
        />
        <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: paddingH }]}>
          <View style={[styles.content, { maxWidth: contentMaxW }]}>
            <View style={styles.logoWrapper}>
              <Image source={logo} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
            </View>
            <View style={styles.textWrapper}>
              <FormattedBody text={STRINGS[language].welcomeBody} theme={theme} fontSize={bodySize} lineHeight={bodyLH} />
            </View>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingHorizontal: paddingH, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [styles.ctaButton, { backgroundColor: theme.colors.primary }, pressed && styles.ctaButtonPressed]}
          >
            <Text style={[styles.ctaText, { color: theme.colors.primaryText }]}>{STRINGS[language].welcomeCtaButton}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 24,
  },
  textWrapper: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    textAlign: 'left',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});


