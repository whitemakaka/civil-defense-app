import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DebugInfo } from '../../search/hooks/useHybridSearch';
import type { AppTheme } from '../../../constants/theme';

type Props = {
  debug: DebugInfo | null;
  theme: AppTheme;
};

export function SearchInsight({ debug, theme }: Props) {
  if (!debug) return null;

  const totalHits = Object.values(debug.keywordHits).reduce((a, b) => a + b, 0);
  const vecScore = debug.avgVectorScore;
  const kwScore = debug.avgKeywordScore;
  const total = vecScore + kwScore || 1;
  const semPct = Math.round((vecScore / total) * 100);
  const kwPct = 100 - semPct;

  const matchedTokens = debug.tokens.filter(t => debug.keywordHits[t] > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <TugOfWarBar semPct={semPct} kwPct={kwPct} theme={theme} />
      <BottomRow
        matchedTokens={matchedTokens}
        keywordHits={debug.keywordHits}
        candidatesCount={debug.candidatesCount}
        totalHits={totalHits}
        theme={theme}
      />
    </View>
  );
}

function TugOfWarBar({ semPct, kwPct, theme }: { semPct: number; kwPct: number; theme: AppTheme }) {
  return (
    <View style={styles.tugBar}>
      <Text style={[styles.tugLabel, { color: '#A78BFA' }]}>SEM {semPct}%</Text>
      <View style={[styles.tugTrack, { backgroundColor: theme.colors.border + '18' }]}>
        <View style={[styles.tugLeft, { width: `${semPct}%` }]} />
        <View style={[styles.tugRight, { width: `${kwPct}%`, backgroundColor: theme.colors.accent }]} />
      </View>
      <Text style={[styles.tugLabel, { color: theme.colors.accent }]}>{kwPct}% KW</Text>
    </View>
  );
}

function BottomRow({
  matchedTokens,
  keywordHits,
  candidatesCount,
  totalHits,
  theme,
}: {
  matchedTokens: string[];
  keywordHits: Record<string, number>;
  candidatesCount: number;
  totalHits: number;
  theme: AppTheme;
}) {
  return (
    <View style={styles.bottomRow}>
      {matchedTokens.length > 0 && (
        <View style={styles.tokensRow}>
          {matchedTokens.map((token, i) => (
            <TokenChip key={i} token={token} hits={keywordHits[token]} theme={theme} />
          ))}
        </View>
      )}
      <Text style={[styles.statsText, { color: theme.colors.textTertiary + '70' }]}>
        {candidatesCount} · {totalHits} hits
      </Text>
    </View>
  );
}

function TokenChip({ token, hits, theme }: { token: string; hits: number; theme: AppTheme }) {
  return (
    <View style={[styles.tokenChip, { backgroundColor: theme.colors.accent + '20' }]}>
      <Text style={[styles.tokenText, { color: theme.colors.accent }]}>{token}</Text>
      <View style={[styles.tokenBadge, { backgroundColor: theme.colors.accent + 'DD' }]}>
        <Text style={styles.tokenBadgeText}>{hits}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 10 },
  tugBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tugLabel: { fontSize: 11, fontWeight: '600', minWidth: 52 },
  tugTrack: { flex: 1, height: 16, borderRadius: 8, flexDirection: 'row', overflow: 'hidden' },
  tugLeft: { height: '100%', backgroundColor: '#8B5CF6' },
  tugRight: { height: '100%' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tokensRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tokenChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 5 },
  tokenText: { fontSize: 12, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tokenBadge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tokenBadgeText: { fontSize: 9, fontWeight: '600', color: '#fff' },
  statsText: { fontSize: 10, fontWeight: '400' },
});
