import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { ColorScheme } from '../../constants/theme';
import { getTheme } from '../../constants/theme';
import type { Language } from '../../constants/strings';
import { loadSettings, saveSettings } from '../../utils/settingsPersistence';

const getDeviceColorScheme = (): ColorScheme => {
  return 'dark'; // Default to dark mode
};

type SettingsState = {
  language: Language;
  colorScheme: ColorScheme;
};

type SettingsContextValue = SettingsState & {
  toggleLanguage: () => void;
  toggleColorScheme: () => void;
  theme: ReturnType<typeof getTheme>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => 'pl');
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => getDeviceColorScheme());
  const [loaded, setLoaded] = useState(false);
  // Set when the user changes a setting; only then is anything written to disk.
  const userChangedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then(saved => {
        if (cancelled) return;
        // A choice made before the load finished wins over the saved value.
        if (!userChangedRef.current) {
          if (saved.language) setLanguage(saved.language);
          if (saved.colorScheme) setColorScheme(saved.colorScheme);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !userChangedRef.current) return;
    saveSettings({ language, colorScheme });
  }, [loaded, language, colorScheme]);

  const value = useMemo<SettingsContextValue>(() => {
    const theme = getTheme(colorScheme);
    return {
      language,
      colorScheme,
      toggleLanguage: () => {
        userChangedRef.current = true;
        setLanguage(prev => (prev === 'pl' ? 'en' : 'pl'));
      },
      toggleColorScheme: () => {
        userChangedRef.current = true;
        setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark'));
      },
      theme,
    };
  }, [colorScheme, language]);

  // Wait for the saved settings so the first screen already uses the saved language and theme.
  // Reading the small file takes a moment; until then show only the dark background.
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: getTheme('dark').colors.background }} />;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
