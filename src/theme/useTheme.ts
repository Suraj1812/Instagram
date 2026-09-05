import { create } from 'zustand';
import { getPalette, ThemeMode, Palette, spacing, radii, typography } from './tokens';
import { getMeta, setMeta } from '../db/repositories/metaRepository';

interface ThemeState {
  mode: ThemeMode;
  palette: Palette;
  hydrate: () => Promise<void>;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  palette: getPalette('light'),
  hydrate: async () => {
    const saved = await getMeta('theme_mode');
    const mode = (saved === 'dark' ? 'dark' : 'light') as ThemeMode;
    set({ mode, palette: getPalette(mode) });
  },
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    set({ mode: next, palette: getPalette(next) });
    setMeta('theme_mode', next);
  },
  setMode: (mode) => {
    set({ mode, palette: getPalette(mode) });
    setMeta('theme_mode', mode);
  },
}));

/** Convenience hook for screens/components: `const t = useTheme();` */
export function useTheme() {
  const palette = useThemeStore((s) => s.palette);
  const mode = useThemeStore((s) => s.mode);
  return { colors: palette, mode, spacing, radii, typography };
}
