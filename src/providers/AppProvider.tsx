import React from 'react';
import { SettingsProvider } from '../stores/settings/settingsStore';
import { BundleProvider } from '../stores/bundle/bundleStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <BundleProvider>
        {children}
      </BundleProvider>
    </SettingsProvider>
  );
}
