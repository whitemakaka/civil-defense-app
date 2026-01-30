import React from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView, type DimensionValue } from 'react-native';
import { useSettings } from '../stores/settings/settingsStore';
import { useSearchSettings } from '../stores/settings/searchSettingsStore';
import { useResponsiveValue } from '../hooks/useResponsive';
import { STRINGS } from '../constants/strings';
import { SectionCard, Chip, SliderTrack } from './settings';

type Props = { visible: boolean; onClose: () => void };

export function SettingsModal({ visible, onClose }: Props) {
  const { language, theme } = useSettings();
  const { languageFilter, setLanguageFilter, searchMode, setSearchMode, alpha, setAlpha, batteryMode, setBatteryMode, idleUnloadTimeout, setIdleUnloadTimeout, debounceMs, setDebounceMs, minQueryLength, setMinQueryLength, resetToDefaults } = useSearchSettings();

  const containerMaxWidth = useResponsiveValue<DimensionValue>({ base: '100%', md: 500, lg: 560, xl: 600 });
  if (!visible) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.background + 'F2' }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, maxWidth: containerMaxWidth }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
          <View style={styles.headerContent}><Text style={styles.headerIcon}>⚙️</Text><Text style={[styles.title, { color: theme.colors.textPrimary }]}>{STRINGS[language].settingsTitle}</Text></View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeIcon, pressed && { opacity: 0.6 }]}><Text style={[styles.closeIconText, { color: theme.colors.textSecondary }]}>✕</Text></Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SectionCard icon="🌐" title={t('Język wyników', 'Results language')} theme={theme}>
            <View style={styles.chipRow}>
              {([['all', t('Wszystkie', 'All')], ['pl', t('Polski', 'Polish')], ['en', t('Angielski', 'English')]] as const).map(([v, l]) => <Chip key={v} label={l} selected={languageFilter === v} onPress={() => setLanguageFilter(v)} theme={theme} />)}
            </View>
          </SectionCard>

          <SectionCard icon="🔍" title={t('Tryb wyszukiwania', 'Search mode')} hint={t('Szybki: 150, Dokładny: 400 kandydatów', 'Fast: 150, Accurate: 400 candidates')} theme={theme}>
            <View style={styles.chipRow}>
              {([['fast', t('⚡ Szybki', '⚡ Fast')], ['accurate', t('🎯 Dokładny', '🎯 Accurate')]] as const).map(([v, l]) => <Chip key={v} label={l} selected={searchMode === v} onPress={() => setSearchMode(v)} theme={theme} />)}
            </View>
          </SectionCard>

          <SectionCard icon="🧠" title={t('Balans wyszukiwania', 'Search balance')} hint={t('Semantyka rozumie kontekst, słowa kluczowe są precyzyjne', 'Semantic understands context, keywords are precise')} theme={theme}>
            <SliderTrack values={[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]} currentValue={alpha} onSelect={setAlpha} leftLabel={t('Słowa', 'Keywords')} rightLabel={t('Semantyka', 'Semantic')} theme={theme} />
          </SectionCard>

          <View style={styles.rowCards}>
            <View style={[styles.halfCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.borderSubtle }]}>
              <View style={styles.miniHeader}><Text style={styles.miniIcon}>⏱️</Text><Text style={[styles.miniTitle, { color: theme.colors.textPrimary }]}>{t('Reakcja', 'Response')}</Text></View>
              <View style={styles.chipRowCompact}>
                {([[200, t('Szybko', 'Fast')], [250, 'Normal'], [400, t('Wolno', 'Slow')]] as const).map(([v, l]) => <Chip key={v} label={l} selected={debounceMs === v} onPress={() => setDebounceMs(v)} theme={theme} compact />)}
              </View>
            </View>
            <View style={[styles.halfCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.borderSubtle }]}>
              <View style={styles.miniHeader}><Text style={styles.miniIcon}>📏</Text><Text style={[styles.miniTitle, { color: theme.colors.textPrimary }]}>{t('Min. znaków', 'Min. chars')}</Text></View>
              <View style={styles.chipRowCompact}>
                {([2, 3] as const).map(v => <Chip key={v} label={String(v)} selected={minQueryLength === v} onPress={() => setMinQueryLength(v)} theme={theme} compact />)}
              </View>
            </View>
          </View>

          <SectionCard icon="🔋" title={t('Tryb baterii', 'Battery mode')} hint={t('Eko: oszczędza energię, Wydajny: max prędkość', 'Eco: saves energy, Performance: max speed')} theme={theme}>
            <View style={styles.chipRow}>
              {([['eco', t('🍃 Eko', '🍃 Eco')], ['performance', t('🚀 Wydajny', '🚀 Performance')]] as const).map(([v, l]) => <Chip key={v} label={l} selected={batteryMode === v} onPress={() => setBatteryMode(v)} theme={theme} />)}
            </View>
          </SectionCard>

          <SectionCard icon="💾" title={t('Auto-zwolnienie pamięci', 'Auto memory release')} hint={t('Po bezczynności zwolnij zasoby modelu', 'Release model resources after idle')} theme={theme}>
            <View style={styles.chipRow}>
              {([['off', t('Wył', 'Off')], [10, '10s'], [20, '20s'], [30, '30s'], [60, '1m'], [120, '2m']] as const).map(([v, l]) => <Chip key={String(v)} label={l} selected={idleUnloadTimeout === v} onPress={() => setIdleUnloadTimeout(v)} theme={theme} compact />)}
            </View>
          </SectionCard>

          <Pressable onPress={resetToDefaults} style={({ pressed }) => [styles.resetButton, { borderColor: theme.colors.warning }, pressed && { opacity: 0.7, backgroundColor: theme.colors.warningMuted }]}>
            <Text style={[styles.resetButtonText, { color: theme.colors.warning }]}>🔄 {t('Przywróć domyślne', 'Reset to defaults')}</Text>
          </Pressable>
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
  scrollContent: { padding: 16, gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRowCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowCards: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  miniIcon: { fontSize: 16 },
  miniTitle: { fontSize: 13, fontWeight: '600' },
  resetButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginTop: 8 },
  resetButtonText: { fontSize: 14, fontWeight: '600' },
});
