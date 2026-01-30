import { NativeModules, Platform } from 'react-native';
import type { Language } from '../constants/strings';

function normalizeLanguageTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function getDeviceLanguage(): Language {
  try {
    const rawLocale =
      Platform.OS === 'ios'
        ? // iOS: AppleLanguages is preferred; AppleLocale can be undefined on some devices.
          NativeModules?.SettingsManager?.settings?.AppleLanguages?.[0] ?? NativeModules?.SettingsManager?.settings?.AppleLocale
        : NativeModules?.I18nManager?.localeIdentifier;

    const normalized = normalizeLanguageTag(rawLocale);
    // If Polish detected, use Polish. Otherwise check if English detected.
    // Default to Polish if language not detected.
    if (normalized.startsWith('pl')) return 'pl';
    if (normalized.startsWith('en')) return 'en';
    return 'pl'; // default to Polish
  } catch {
    return 'pl'; // default to Polish
  }
}


