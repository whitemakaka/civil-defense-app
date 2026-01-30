import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useSettings } from '../stores/settings/settingsStore';
import { useResponsiveValue } from '../hooks/useResponsive';
import { STRINGS } from '../constants/strings';
import type { Manifest } from '../features/search/types';
import { FormattedInfo, EmbeddingInfo, CopyableLink } from './info';

const LINKS = {
  github: 'https://github.com/whitemakaka/civil-defense-app',
  email: 'mailto:apps.whitemakaka@gmail.com',
  twitter: 'https://x.com/whitemakaka',
  rcb: 'https://www.gov.pl/web/rcb',
};

type Props = { visible: boolean; onClose: () => void };

export function InfoModal({ visible, onClose }: Props) {
  const { language, colorScheme, theme } = useSettings();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const containerMaxWidth = useResponsiveValue<DimensionValue>({ base: '100%', md: 500, lg: 560, xl: 600 });

  useEffect(() => {
    if (visible) {
      (async () => {
        try {
          const RNFS = require('react-native-fs');
          const raw = await RNFS.readFileAssets('offline_bundle/manifest.json', 'utf8');
          setManifest(JSON.parse(raw) as Manifest);
        } catch { setManifest(null); }
      })();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.4)' }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, maxWidth: containerMaxWidth }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>ℹ️</Text>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{language === 'pl' ? 'Informacje' : 'Information'}</Text>
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeIcon, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.closeIconText, { color: theme.colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <FormattedInfo text={STRINGS[language].infoBody} theme={theme} />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {language === 'pl' ? 'WYSZUKIWANIE WEKTOROWE:' : 'VECTOR SEARCH:'}
            </Text>
            <EmbeddingInfo manifest={manifest} theme={theme} language={language} />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {language === 'pl' ? 'LINKI:' : 'LINKS:'}
            </Text>
            <CopyableLink label={language === 'pl' ? 'Kod źródłowy (GitHub)' : 'Source code (GitHub)'} url={LINKS.github} theme={theme} language={language} />
            <CopyableLink label={language === 'pl' ? 'Kontakt (Email)' : 'Contact (Email)'} url={LINKS.email} theme={theme} language={language} />
            <CopyableLink label={language === 'pl' ? 'Twitter / X' : 'Twitter / X'} url={LINKS.twitter} theme={theme} language={language} />
            <CopyableLink label={language === 'pl' ? 'Rządowe Centrum Bezpieczeństwa' : 'Government Security Center'} url={LINKS.rcb} theme={theme} language={language} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 16,
    zIndex: 200,
    elevation: 200,
  },
  container: { borderRadius: 24, borderWidth: 1, maxHeight: '88%', overflow: 'hidden', alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: 22 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  closeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeIconText: { fontSize: 18, fontWeight: '600' },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  section: { marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.3)' },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
});
