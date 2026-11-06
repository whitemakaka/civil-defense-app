import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../stores/settings/settingsStore';
import { useBundle } from '../stores/bundle/bundleStore';
import { useResponsiveValue } from '../hooks/useResponsive';
import { STRINGS } from '../constants/strings';
import { FormattedInfo, EmbeddingInfo, ExternalLink } from './info';
import LINKS from '../config/links.json';
import { SourceCatalog } from './SourceCatalog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIUS } from '../constants/theme';

type Props = { visible: boolean; onClose: () => void };

export function InfoModal({ visible, onClose }: Props) {
  const { language, theme } = useSettings();
  const bundle = useBundle();
  const manifest = bundle.status === 'ready' ? bundle.manifest : null;
  const containerMaxWidth = useResponsiveValue<DimensionValue>({ base: '100%', md: 500, lg: 560, xl: 600 });
  const strings = STRINGS[language];
  // The modal window covers the whole screen (edge-to-edge), so size the card explicitly
  // between the status bar and the navigation bar; percentage heights are unreliable here.
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const verticalMargin = 16;
  const containerMaxHeight = Math.max(0, windowHeight - insets.top - insets.bottom - verticalMargin * 2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay, paddingTop: insets.top + verticalMargin, paddingBottom: insets.bottom + verticalMargin }]}>
        <View style={[styles.container, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, maxWidth: containerMaxWidth, maxHeight: containerMaxHeight }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{strings.infoTitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={strings.a11yClose}
              hitSlop={6}
              style={({ pressed }) => [styles.closeIcon, pressed && { opacity: 0.6 }]}>
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <FormattedInfo text={strings.infoBody} theme={theme} />
            <SourceCatalog language={language} theme={theme} />

            <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {language === 'pl' ? 'WYSZUKIWANIE WEKTOROWE:' : 'VECTOR SEARCH:'}
              </Text>
              <EmbeddingInfo manifest={manifest} theme={theme} language={language} />
              <Text style={[styles.licenseText, { color: theme.colors.textSecondary }]}>{strings.modelLicense}</Text>
              <ExternalLink label={strings.gemmaTerms} url={LINKS.gemmaTerms} theme={theme} language={language} />
              <ExternalLink label={strings.gemmaProhibitedUse} url={LINKS.gemmaProhibitedUse} theme={theme} language={language} />
            </View>

            <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {language === 'pl' ? 'LINKI:' : 'LINKS:'}
              </Text>
              <ExternalLink label={language === 'pl' ? 'Strona aplikacji' : 'App website'} url={LINKS.website} theme={theme} language={language} />
              <ExternalLink label={language === 'pl' ? 'Kod źródłowy (GitHub)' : 'Source code (GitHub)'} url={LINKS.github} theme={theme} language={language} />
              <ExternalLink label={language === 'pl' ? 'Kontakt (Email)' : 'Contact (Email)'} url={LINKS.email} theme={theme} language={language} />
              <ExternalLink label="Twitter / X" url={LINKS.twitter} theme={theme} language={language} />
              <ExternalLink label={language === 'pl' ? 'Rządowe Centrum Bezpieczeństwa' : 'Government Security Center'} url={LINKS.rcb} theme={theme} language={language} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  container: { borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden', alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  closeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  section: { marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  licenseText: { fontSize: 13, lineHeight: 18, marginTop: 12, marginBottom: 8 },
});
