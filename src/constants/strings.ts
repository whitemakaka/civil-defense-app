export type Language = 'pl' | 'en';

export const STRINGS: Record<Language, {
  welcomeBody: string;
  infoBody: string;
  sourcesHeading: string;
  sourcesLoadError: string;
  welcomeCtaButton: string;
  chatPlaceholder: string;
  welcomeChat: string;
  noResults: string;
  fullNote: string;
  pagesAbbrev: string;
  copied: string;
  updating: string;
  errorIndex: string;
  errorModel: string;
  errorSearch: string;
  infoTitle: string;
  a11yToggleLanguage: string;
  a11yToggleTheme: string;
  a11yInfo: string;
  a11yClose: string;
  a11yOpenNote: string;
  a11yStatus: Record<'idle' | 'loading' | 'searching' | 'ready' | 'error', string>;
  emergencyLabel: string;
  emergencyA11y: string;
  emergencyCallError: string;
  a11ySearchInput: string;
  a11yClear: string;
  copy: string;
  share: string;
  bestMatch: string;
  sharedFrom: string;
  modelLicense: string;
  gemmaTerms: string;
  gemmaProhibitedUse: string;
}> = {
  pl: {
    welcomeBody:
      'Praktyczne wskazówki na sytuacje kryzysowe, opracowane na podstawie oficjalnych poradników i zaleceń. Poradniki i instytucje wymieniono poniżej; źródła konkretnej notki zobaczysz po jej rozwinięciu.\n\n' +
      'W zagrożeniu stosuj się do aktualnych komunikatów i poleceń służb.',
    infoBody:
      'O aplikacji:\n' +
      'Notki opracowano na podstawie poniższych poradników i materiałów instytucji.\n\n' +
      'Wyszukiwanie:\n' +
      'Wyszukiwanie rozpoznaje znaczenie pytania i porównuje je z całymi notkami oraz ich fragmentami. Wynik pokazuje pełną notkę; jej źródła są widoczne po rozwinięciu. Wszystko działa offline.\n\n' +
      'Prywatność:\n' +
      'Zapytania pozostają na urządzeniu i nie są zapisywane. Otwarcie zewnętrznego odnośnika może uruchomić przeglądarkę.\n\n' +
      'Uwaga:\n' +
      'W sytuacji zagrożenia kieruj się aktualnymi komunikatami i poleceniami służb.',
    sourcesHeading: 'Źródła',
    sourcesLoadError: 'Nie udało się wczytać listy źródeł.',
    welcomeCtaButton: 'Rozpocznij',
    chatPlaceholder: 'Opisz sytuację…',
    welcomeChat:
      'Cześć! Opisz sytuację własnymi słowami, np. „nie ma prądu” albo „ktoś nie oddycha”, i wybierz notkę, aby zobaczyć całą treść ze źródłami. Działa bez internetu.\n\n' +
      'To wyszukiwarka gotowych instrukcji, nie asystent. W zagrożeniu życia dzwoń pod 112.',
    noResults: 'Brak dobrego dopasowania. Spróbuj opisać sytuację inaczej.',
    fullNote: 'Cała notka',
    pagesAbbrev: 's.',
    copied: 'Skopiowano',
    updating: 'Aktualizuję…',
    errorIndex: 'Nie udało się wczytać danych.',
    errorModel: 'Nie udało się wczytać modelu.',
    errorSearch: 'Wyszukiwanie nie powiodło się.',
    infoTitle: 'Informacje',
    a11yToggleLanguage: 'Przełącz na angielski',
    a11yToggleTheme: 'Przełącz motyw',
    a11yInfo: 'Informacje',
    a11yClose: 'Zamknij',
    a11yOpenNote: 'Otwórz notkę',
    a11yStatus: {
      idle: 'Wyszukiwanie nieaktywne',
      loading: 'Ładowanie',
      searching: 'Szukam',
      ready: 'Gotowe',
      error: 'Błąd',
    },
    emergencyLabel: '112',
    emergencyA11y: 'Zadzwoń pod numer alarmowy 112',
    emergencyCallError: 'Nie udało się otworzyć aplikacji telefonu. Wybierz 112 ręcznie.',
    a11ySearchInput: 'Pole wyszukiwania',
    a11yClear: 'Wyczyść',
    copy: 'Kopiuj',
    share: 'Udostępnij',
    bestMatch: 'Najlepsze dopasowanie',
    sharedFrom: 'Z aplikacji Civil Defence',
    modelLicense:
      'Model PolDense-17M (OPI-PIB) jest udostępniany na warunkach Gemma Terms of Use. ' +
      'Na potrzeby aplikacji przekonwertowano go do formatu ONNX i dodano wyliczanie wektora wyniku (pooling CLS, normalizacja L2). ' +
      'Korzystanie z modelu podlega zasadom niedozwolonego użycia Gemma.',
    gemmaTerms: 'Warunki Gemma (Gemma Terms of Use)',
    gemmaProhibitedUse: 'Zasady niedozwolonego użycia Gemma',
  },
  en: {
    welcomeBody:
      'Practical guidance for emergencies, based on official guides and recommendations. The guides and organizations are listed below; expand a note to see its sources.\n\n' +
      'In an emergency, follow current official alerts and instructions from emergency services.',
    infoBody:
      'About:\n' +
      'These notes were prepared from the guides and institutional materials listed below.\n\n' +
      'Search:\n' +
      'Search compares the meaning of your question with complete notes and their passages. Each result shows the full note; expand it to see its sources. Everything works offline.\n\n' +
      'Privacy:\n' +
      'Queries stay on your device and are not saved. Opening an external link may launch your browser.\n\n' +
      'Note:\n' +
      'In an emergency, follow current official alerts and instructions from emergency services.',
    sourcesHeading: 'Sources',
    sourcesLoadError: 'Could not load the source list.',
    welcomeCtaButton: 'Start',
    chatPlaceholder: 'Describe the situation…',
    welcomeChat:
      "Hi! Describe the situation in your own words, e.g. “no power” or “someone isn't breathing”, then tap a note to see the full text with sources. Works offline.\n\n" +
      'This searches ready-made instructions; it is not an assistant. If life is at risk, call 112.',
    noResults: 'No good match. Try describing the situation differently.',
    fullNote: 'Full note',
    pagesAbbrev: 'p.',
    copied: 'Copied',
    updating: 'Updating…',
    errorIndex: 'Could not load data.',
    errorModel: 'Could not load the model.',
    errorSearch: 'Search failed.',
    infoTitle: 'Information',
    a11yToggleLanguage: 'Switch to Polish',
    a11yToggleTheme: 'Switch theme',
    a11yInfo: 'Information',
    a11yClose: 'Close',
    a11yOpenNote: 'Open note',
    a11yStatus: {
      idle: 'Search inactive',
      loading: 'Loading',
      searching: 'Searching',
      ready: 'Ready',
      error: 'Error',
    },
    emergencyLabel: '112',
    emergencyA11y: 'Call the emergency number 112',
    emergencyCallError: 'Could not open the phone app. Dial 112 manually.',
    a11ySearchInput: 'Search field',
    a11yClear: 'Clear',
    copy: 'Copy',
    share: 'Share',
    bestMatch: 'Best match',
    sharedFrom: 'From the Civil Defence app',
    modelLicense:
      'The PolDense-17M model (OPI-PIB) is provided under the Gemma Terms of Use. ' +
      'For this app it was converted to ONNX format, with CLS pooling and L2 normalisation added to its output. ' +
      'Use of the model is subject to the Gemma Prohibited Use Policy.',
    gemmaTerms: 'Gemma Terms of Use',
    gemmaProhibitedUse: 'Gemma Prohibited Use Policy',
  },
};

export function formatPointCount(count: number, language: Language): string {
  if (language === 'en') {
    return count === 1 ? '1 point' : `${count} points`;
  }
  if (count === 1) return '1 punkt';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${count} punkty`;
  }
  return `${count} punktów`;
}

export function formatResultCount(count: number, language: Language): string {
  if (language === 'en') {
    return count === 1 ? '1 result' : `${count} results`;
  }
  if (count === 1) return '1 wynik';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${count} wyniki`;
  }
  return `${count} wyników`;
}
