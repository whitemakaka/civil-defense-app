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
    success: string;
    successMuted: string;
    warning: string;
    danger: string;
    dangerMuted: string;
    emergency: string;
    emergencyText: string;
    overlay: string;
  };
};

/** Corner radii: controls, cards and bubbles, pills and the search field. */
export const RADIUS = { sm: 12, md: 20, full: 999 } as const;

/** Minimum touch target in dp (Android guideline). */
export const MIN_TOUCH = 48;

// Dark is the default and stays truly dark: near-black background, graphite surfaces,
// warm orange accent taken from the logo. Every text pair meets WCAG 4.5:1.
const darkTheme: AppTheme = {
  colors: {
    background: '#0B0B0F',
    surface: '#15151A',
    surfaceElevated: '#1F1F26',
    border: '#33333C',
    borderSubtle: '#232329',
    inputBorder: '#44444E',
    inputBackground: '#15151A',
    textPrimary: '#F5F5F7',
    textSecondary: '#B0B0BA',
    textTertiary: '#8F8F9B',
    muted: '#8F8F9B',
    primary: '#FF7A3D',
    primaryMuted: '#FF7A3D26',
    primaryText: '#1A0B05',
    accent: '#FFB38A',
    success: '#4ADE80',
    successMuted: '#4ADE8026',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerMuted: '#F8717126',
    emergency: '#D32F2F',
    emergencyText: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.85)',
  },
};

const lightTheme: AppTheme = {
  colors: {
    background: '#F6F4EF',
    surface: '#FFFFFF',
    surfaceElevated: '#EEEBE4',
    border: '#D9D6CF',
    borderSubtle: '#E8E5DE',
    inputBorder: '#C9C5BC',
    inputBackground: '#FFFFFF',
    textPrimary: '#1A1A1F',
    textSecondary: '#4F4F58',
    textTertiary: '#62626C',
    muted: '#62626C',
    primary: '#B03A0A',
    primaryMuted: '#B03A0A1A',
    primaryText: '#FFFFFF',
    accent: '#9A3412',
    success: '#166534',
    successMuted: '#16653414',
    warning: '#B45309',
    danger: '#B91C1C',
    dangerMuted: '#B91C1C14',
    emergency: '#B91C1C',
    emergencyText: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.45)',
  },
};

export function getTheme(colorScheme: ColorScheme): AppTheme {
  return colorScheme === 'light' ? lightTheme : darkTheme;
}
