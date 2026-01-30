export type Language = 'pl' | 'en';

export const STRINGS: Record<
  Language,
  {
    appTitle: string;
    appSubtitle: string;
    welcomeSubtitle: string;
    welcomeBody: string;
    infoBody: string;
    welcomeCtaButton: string;
    chatTitle: string;
    chatPlaceholder: string;
    toggleLangShort: string;
    toggleThemeShort: string;
    settingsTitle: string;
    settingsClose: string;
  }
> = {
  pl: {
    appTitle: 'Civil Defence',
    appSubtitle: 'eastern flank',
    welcomeSubtitle: 'Wprowadzenie',
    welcomeBody:
      'Wyszukiwarka cytatów z oficjalnych poradników obrony cywilnej — aplikacja offline pomagająca przygotować się na sytuacje kryzysowe. Działa lokalnie na Twoim urządzeniu.\n\n' +
      'Bezpieczeństwo i prywatność:\n' +
      '- Aplikacja nie zbiera żadnych danych użytkownika\n' +
      '- Nie komunikuje się z internetem po instalacji\n' +
      '- Wszystkie dane przetwarzane są lokalnie\n' +
      '- Zapytania nie są zapisywane\n\n' +
      'Źródła danych:\n' +
      '- Bądź gotowy – poradnik na czas kryzysu i wojny\n' +
      '- Poradnik bezpieczeństwa\n\n' +
      'Uwaga:\n' +
      'To narzędzie wspierające — w sytuacji zagrożenia zawsze kieruj się oficjalnymi komunikatami i poleceniami lokalnych służb.',
    infoBody:
      'O aplikacji:\n' +
      'Offline wyszukiwarka cytatów z oficjalnych poradników obrony cywilnej. Wykorzystuje hybrydowe wyszukiwanie (słowa kluczowe + wektory semantyczne) do szybkiego znalezienia odpowiednich fragmentów.\n\n' +
      'Jak działa:\n' +
      '• Wpisujesz zapytanie\n' +
      '• Etap 1: wyszukiwanie po słowach kluczowych (150-400 kandydatów)\n' +
      '• Etap 2: ranking semantyczny (cosine similarity)\n' +
      '• Wynik: top 10 najbardziej pasujących cytatów\n\n' +
      'Źródła danych:\n' +
      '- Bądź gotowy – poradnik na czas kryzysu i wojny (RCB)\n' +
      '- Poradnik bezpieczeństwa (RCB)\n\n' +
      'Technologia:\n' +
      '- Model embeddingów: paraphrase-multilingual-MiniLM-L12-v2\n' +
      '- Wymiar wektorów: 384\n' +
      '- Języki: polski, angielski\n\n' +
      'Prywatność:\n' +
      '- Zero telemetrii i analityki\n' +
      '- Brak połączeń sieciowych\n' +
      '- Zapytania nie są zapisywane\n' +
      '- Przetwarzanie offline na urządzeniu\n\n' +
      'Licencja:\n' +
      '- Aplikacja: MIT\n' +
      '- Model: Apache 2.0\n\n' +
      'Disclaimer:\n' +
      'To narzędzie wspierające. W sytuacji zagrożenia kieruj się oficjalnymi komunikatami lokalnych służb.',
    welcomeCtaButton: 'Rozpocznij',
    chatTitle: 'Wyszukiwarka',
    chatPlaceholder: 'Szukaj cytatów…',
    toggleLangShort: 'PL/EN',
    toggleThemeShort: 'Tryb',
    settingsTitle: 'Ustawienia',
    settingsClose: 'Zamknij',
  },
  en: {
    appTitle: 'Civil Defence',
    appSubtitle: 'eastern flank',
    welcomeSubtitle: 'Introduction',
    welcomeBody:
      'Quote search from official civil defense guides — an offline app to help you prepare for emergencies. Works locally on your device.\n\n' +
      'Security and privacy:\n' +
      '- The app does not collect any user data\n' +
      '- Does not communicate with the internet after installation\n' +
      '- All data is processed locally\n' +
      '- Queries are not saved\n\n' +
      'Data sources:\n' +
      '- Get Ready\n' +
      '- Safety Handbook\n\n' +
      'Note:\n' +
      'This is a support tool — in an emergency, always follow official communications and instructions from local authorities.',
    infoBody:
      'About:\n' +
      'Offline quote search from official civil defense handbooks. Uses hybrid search (keywords + semantic vectors) to quickly find relevant passages.\n\n' +
      'How it works:\n' +
      '• You type a query\n' +
      '• Stage 1: keyword search (150-400 candidates)\n' +
      '• Stage 2: semantic ranking (cosine similarity)\n' +
      '• Result: top 10 best matching quotes\n\n' +
      'Data sources:\n' +
      '- Get Ready (RCB - Government Security Center)\n' +
      '- Safety Handbook (RCB)\n\n' +
      'Technology:\n' +
      '- Embedding model: paraphrase-multilingual-MiniLM-L12-v2\n' +
      '- Vector dimension: 384\n' +
      '- Languages: Polish, English\n\n' +
      'Privacy:\n' +
      '- Zero telemetry and analytics\n' +
      '- No network connections\n' +
      '- Queries are not saved\n' +
      '- Offline on-device processing\n\n' +
      'License:\n' +
      '- App: MIT\n' +
      '- Model: Apache 2.0\n\n' +
      'Disclaimer:\n' +
      'This is a support tool. In emergencies, follow official communications from local authorities.',
    welcomeCtaButton: 'Start',
    chatTitle: 'Search',
    chatPlaceholder: 'Search quotes…',
    toggleLangShort: 'PL/EN',
    toggleThemeShort: 'Theme',
    settingsTitle: 'Settings',
    settingsClose: 'Close',
  },
};
