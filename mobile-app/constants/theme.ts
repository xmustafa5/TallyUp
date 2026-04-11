export const brand = {
  teal: '#2C7A7B',
  tealDeep: '#1A365D',
  tealSoft: '#E3EFEF',
  gold: '#D69E2E',
  goldSoft: '#F4E3B6',
  goldDeep: '#A67716',
  cream: '#F7FAFC',
  creamDeep: '#F0E9D8',
  ink: '#1A365D',
  white: '#FFFFFF',
} as const;

export const colors = {
  light: {
    background: brand.cream,
    surface: brand.white,
    surfaceAlt: brand.creamDeep,
    text: brand.ink,
    textSecondary: '#4A5568',
    textTertiary: '#718096',
    border: 'rgba(26,54,93,0.08)',
    borderStrong: 'rgba(26,54,93,0.16)',
    primary: brand.teal,
    primaryDeep: brand.tealDeep,
    primaryLight: brand.tealSoft,
    accent: brand.gold,
    accentLight: brand.goldSoft,
    success: brand.teal,
    successLight: brand.tealSoft,
    warning: brand.gold,
    warningLight: brand.goldSoft,
    error: '#C53030',
    errorLight: '#FED7D7',
    streak: brand.gold,
    streakLight: brand.goldSoft,
    card: brand.white,
    tabBar: brand.white,
    tabBarBorder: 'rgba(26,54,93,0.06)',
    tabBarActive: brand.teal,
    tabBarInactive: '#A0AEC0',
  },
  dark: {
    background: '#0B1F2A',
    surface: '#12303A',
    surfaceAlt: '#1A3F4C',
    text: '#F7FAFC',
    textSecondary: '#A0AEC0',
    textTertiary: '#718096',
    border: 'rgba(247,250,252,0.08)',
    borderStrong: 'rgba(247,250,252,0.16)',
    primary: '#4FB3B4',
    primaryDeep: '#2C7A7B',
    primaryLight: '#12303A',
    accent: '#E8BF5A',
    accentLight: '#4A3A12',
    success: '#4FB3B4',
    successLight: '#12303A',
    warning: '#E8BF5A',
    warningLight: '#4A3A12',
    error: '#FC8181',
    errorLight: '#63171B',
    streak: '#E8BF5A',
    streakLight: '#4A3A12',
    card: '#12303A',
    tabBar: '#12303A',
    tabBarBorder: 'rgba(247,250,252,0.08)',
    tabBarActive: '#4FB3B4',
    tabBarInactive: '#718096',
  },
} as const;

export type ThemeColors = typeof colors.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyLg: { fontSize: 17, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
} as const;

export const shadows = {
  sm: { boxShadow: '0 1px 2px rgba(26,54,93,0.06)' },
  md: { boxShadow: '0 4px 16px rgba(26,54,93,0.08)' },
  lg: { boxShadow: '0 12px 28px rgba(26,54,93,0.12)' },
} as const;

const toArabicDigits = (n: number | string): string => {
  const map: Record<string, string> = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩',
  };
  return String(n).replace(/[0-9]/g, (d) => map[d] ?? d);
};

export const format = { toArabicDigits };
