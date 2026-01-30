export type ColorScheme = 'dark' | 'light';

export type AppTheme = {
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    borderSubtle: string;
    inputBorder: string;
    inputBackground: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    muted: string;
    primary: string;
    primaryMuted: string;
    primaryText: string;
    accent: string;
    accentMuted: string;
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    cardBg: string;
    glowPrimary: string;
    glowAccent: string;
  };
};

const darkTheme: AppTheme = {
  colors: {
    background: '#09090B',
    surface: '#18181B',
    surfaceElevated: '#27272A',
    border: '#3F3F46',
    borderSubtle: '#27272A',
    inputBorder: '#52525B',
    inputBackground: '#18181B',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    muted: '#52525B',
    primary: '#6366F1',
    primaryMuted: '#6366F133',
    primaryText: '#FFFFFF',
    accent: '#22D3EE',
    accentMuted: '#22D3EE26',
    success: '#34D399',
    successMuted: '#34D39926',
    warning: '#FBBF24',
    warningMuted: '#FBBF2426',
    cardBg: '#1C1C1F',
    glowPrimary: '#6366F140',
    glowAccent: '#22D3EE30',
  },
};

const lightTheme: AppTheme = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#F4F4F5',
    border: '#E4E4E7',
    borderSubtle: '#F4F4F5',
    inputBorder: '#D4D4D8',
    inputBackground: '#FFFFFF',
    textPrimary: '#18181B',
    textSecondary: '#52525B',
    textTertiary: '#A1A1AA',
    muted: '#71717A',
    primary: '#7C7CDB',       // softened indigo (less saturated)
    primaryMuted: '#7C7CDB18', // reduced opacity for subtler bg
    primaryText: '#FFFFFF',
    accent: '#0E9AAA',        // slightly muted cyan
    accentMuted: '#0E9AAA12',
    success: '#059669',
    successMuted: '#05966915',
    warning: '#D97706',
    warningMuted: '#D9770615',
    cardBg: '#FFFFFF',
    glowPrimary: '#7C7CDB20',
    glowAccent: '#0E9AAA18',
  },
};

export function getTheme(colorScheme: ColorScheme): AppTheme {
  return colorScheme === 'light' ? lightTheme : darkTheme;
}
