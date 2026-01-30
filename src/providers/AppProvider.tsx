import React from 'react';
import { SettingsProvider } from '../stores/settings/settingsStore';
import { SearchSettingsProvider } from '../stores/settings/searchSettingsStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <SearchSettingsProvider>
        {children}
      </SearchSettingsProvider>
    </SettingsProvider>
  );
}
