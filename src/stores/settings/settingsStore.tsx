import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ColorScheme } from '../../constants/theme';
import { getTheme } from '../../constants/theme';
import type { Language } from '../../constants/strings';

const getDeviceColorScheme = (): ColorScheme => {
  return 'dark'; // Default to dark mode
};

type SettingsState = {
  language: Language;
  colorScheme: ColorScheme;
};

type SettingsContextValue = SettingsState & {
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  theme: ReturnType<typeof getTheme>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => 'pl');
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => getDeviceColorScheme());

  const value = useMemo<SettingsContextValue>(() => {
    const theme = getTheme(colorScheme);
    return {
      language,
      colorScheme,
      setLanguage,
      toggleLanguage: () => setLanguage(prev => (prev === 'pl' ? 'en' : 'pl')),
      setColorScheme,
      toggleColorScheme: () => setColorScheme(prev => (prev === 'dark' ? 'light' : 'dark')),
      theme,
    };
  }, [colorScheme, language]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
