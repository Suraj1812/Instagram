export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 6, md: 10, lg: 16, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyBold: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  danger: string;
  success: string;
  overlay: string;
}

export const darkPalette: Palette = {
  bg: '#000000',
  surface: '#121212',
  surfaceAlt: '#1e1e1e',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#9a9a9a',
  accent: '#3797f0',
  danger: '#ff4d4f',
  success: '#2ecc71',
  overlay: 'rgba(0,0,0,0.55)',
};

export const lightPalette: Palette = {
  bg: '#ffffff',
  surface: '#f7f7f7',
  surfaceAlt: '#efefef',
  border: '#e2e2e2',
  text: '#0a0a0a',
  textMuted: '#6b6b6b',
  accent: '#3797f0',
  danger: '#e0244b',
  success: '#1e9e5a',
  overlay: 'rgba(0,0,0,0.4)',
};

export type ThemeMode = 'dark' | 'light';

export function getPalette(mode: ThemeMode): Palette {
  return mode === 'dark' ? darkPalette : lightPalette;
}
