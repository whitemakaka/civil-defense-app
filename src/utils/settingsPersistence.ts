import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { ColorScheme } from '../constants/theme';
import type { Language } from '../constants/strings';

export type PersistedSettings = {
  language?: Language;
  colorScheme?: ColorScheme;
};

const getSettingsPath = (): string | null => {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return null;
  }
  return `${FileSystem.documentDirectory}settings.json`;
};

const isLanguage = (value: unknown): value is Language => value === 'pl' || value === 'en';

const isColorScheme = (value: unknown): value is ColorScheme =>
  value === 'dark' || value === 'light';

/** Reads saved settings. Returns only valid fields; any error yields an empty object. */
export async function loadSettings(): Promise<PersistedSettings> {
  const path = getSettingsPath();
  if (!path) {
    return {};
  }
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return {};
    }
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const { language, colorScheme } = parsed as Record<string, unknown>;
    const result: PersistedSettings = {};
    if (isLanguage(language)) {
      result.language = language;
    }
    if (isColorScheme(colorScheme)) {
      result.colorScheme = colorScheme;
    }
    return result;
  } catch {
    return {};
  }
}

/** Saves settings. Errors are ignored. */
export function saveSettings(settings: { language: Language; colorScheme: ColorScheme }): void {
  const path = getSettingsPath();
  if (!path) {
    return;
  }
  try {
    FileSystem.writeAsStringAsync(
      path,
      JSON.stringify({ language: settings.language, colorScheme: settings.colorScheme }),
    ).catch(() => {});
  } catch {
    // ignore
  }
}
