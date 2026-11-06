import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { STRINGS, type Language } from '../constants/strings';
import type { AppTheme } from '../constants/theme';
import type { SourceCatalogEntry } from '../features/search/infrastructure/loaders/BundleLoader';
import { useBundle } from '../stores/bundle/bundleStore';
import sourceGroups from '../config/sourceGroups.json';

type SourceItem = {
  id: string;
  label: Record<Language, string>;
};

type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; items: SourceItem[] }
  | { status: 'error' };

export function buildSourceItems(entries: SourceCatalogEntry[]): SourceItem[] {
  const available = new Map(entries.map(entry => [entry.id, entry]));
  const assigned = new Set<string>();
  for (const group of sourceGroups) {
    const introOnly = 'introOnly' in group && group.introOnly === true;
    if (!group.label.pl.trim() || !group.label.en.trim() || (!introOnly && group.sourceIds.length === 0)) {
      throw new Error(`Invalid introductory source group ${group.id}`);
    }
    for (const sourceId of group.sourceIds) {
      if (!available.has(sourceId) || assigned.has(sourceId)) {
        throw new Error(`Unknown or duplicated introductory source ${sourceId}`);
      }
      assigned.add(sourceId);
    }
  }
  if (assigned.size !== available.size) {
    throw new Error('Introductory source groups do not cover every source');
  }

  return sourceGroups.flatMap(group => {
    if ('showInIntro' in group && group.showInIntro === false) {
      return [];
    }

    if ('introOnly' in group && group.introOnly === true) {
      return [{ id: group.id, label: group.label }];
    }

    if (!group.detailByCountry) {
      return [{ id: group.id, label: group.label }];
    }

    return group.sourceIds
      .map(sourceId => available.get(sourceId)!)
      .filter(entry => !entry.content.pl.url && !entry.content.en.url)
      .map(entry => ({
        id: entry.id,
        label: {
          pl: `${entry.content.pl.title} (${entry.content.pl.country})`,
          en: `${entry.content.en.title} (${entry.content.en.country})`,
        },
      }));
  });
}

export function SourceCatalog({ language, theme }: {
  language: Language;
  theme: AppTheme;
}) {
  const bundle = useBundle();
  const sourceCatalog = bundle.status === 'ready' ? bundle.sourceCatalog : null;
  const state = useMemo<CatalogState>(() => {
    if (bundle.status === 'loading') return { status: 'loading' };
    if (sourceCatalog === null) return { status: 'error' };
    try {
      return { status: 'ready', items: buildSourceItems(sourceCatalog) };
    } catch {
      return { status: 'error' };
    }
  }, [bundle.status, sourceCatalog]);

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>{STRINGS[language].sourcesHeading}</Text>
      {state.status === 'loading' && <ActivityIndicator color={theme.colors.primary} />}
      {state.status === 'error' && <Text style={{ color: theme.colors.warning }}>{STRINGS[language].sourcesLoadError}</Text>}
      {state.status === 'ready' && state.items.map(item => (
        <Text key={item.id} style={[styles.item, { color: theme.colors.textSecondary }]}>
          {item.label[language]}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 18, gap: 4 },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  item: { fontSize: 14, lineHeight: 20 },
});
