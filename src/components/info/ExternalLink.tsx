import React, { useCallback } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIUS, type AppTheme } from '../../constants/theme';

type Props = { label: string; url: string; theme: AppTheme; language: 'pl' | 'en' };

export function ExternalLink({ label, url, theme, language }: Props) {
  const displayUrl = url.replace(/^mailto:/i, '');

  const handleOpen = useCallback(async () => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (cause) {
      Alert.alert(
        language === 'pl' ? 'Nie udało się otworzyć linku' : 'Could not open the link',
        `${url}\n\n${String(cause)}`,
      );
    }
  }, [url, language]);

  return (
    <Pressable
      onPress={handleOpen}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${displayUrl}`}
      accessibilityHint={language === 'pl' ? 'Otwiera zewnętrzną aplikację' : 'Opens an external app'}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.surfaceElevated }, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.url, { color: theme.colors.textPrimary }]} numberOfLines={1}>{displayUrl}</Text>
      </View>
      <MaterialCommunityIcons name="open-in-new" size={16} color={theme.colors.textTertiary} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.sm },
  pressed: { opacity: 0.7 },
  info: { flex: 1 },
  label: { fontSize: 13, marginBottom: 2 },
  url: { fontSize: 13, fontFamily: 'monospace' },
  icon: { marginLeft: 8 },
});
