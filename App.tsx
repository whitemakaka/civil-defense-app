import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import WelcomeScreen from './src/features/onboarding/screens/WelcomeScreen';
import ChatScreen from './src/features/chat/screens/ChatScreen';
import { AppProvider } from './src/providers/AppProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getTheme } from './src/constants/theme';

const loadingColors = getTheme('dark').colors;

const getOnboardingFlagPath = () => {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return null;
  }
  return `${FileSystem.documentDirectory}onboarding_done`;
};

export default function App() {
  const [route, setRoute] = useState<'loading' | 'welcome' | 'chat'>('loading');

  useEffect(() => {
    const flagPath = getOnboardingFlagPath();
    if (!flagPath) {
      setRoute('welcome');
      return;
    }
    
    FileSystem.getInfoAsync(flagPath).then(info => {
      setRoute(info.exists ? 'chat' : 'welcome');
    }).catch(() => {
      setRoute('welcome');
    });
  }, []);

  const handleNext = useCallback(async () => {
    const flagPath = getOnboardingFlagPath();
    
    if (flagPath) {
      FileSystem.writeAsStringAsync(flagPath, '1').catch(() => {});
    }
    
    setRoute('chat');
  }, []);

  if (route === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={loadingColors.primary} />
      </View>
    );
  }

  return (
    <AppProvider>
      <SafeAreaProvider style={styles.container}>
        {route === 'welcome' ? <WelcomeScreen onNext={handleNext} /> : <ChatScreen />}
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: loadingColors.background,
  },
});
