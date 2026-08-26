'use client';

import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { colors, type ColorToken } from '@reka-bytes/shared';

export type ThemeMode = 'dark' | 'light';

const themeModeAtom = atomWithStorage<ThemeMode>('reka-theme', 'dark');

/**
 * Theme hook — typed HEX palette access + mode persistence.
 * Light palette lands in Phase 4; until then `c` always returns the dark
 * tokens and `mode` is stored for a seamless switch later.
 */
export function useTheme() {
  const [mode, setMode] = useAtom(themeModeAtom);
  return {
    mode,
    isDark: true,
    setMode,
    toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    c: colors as Record<ColorToken, string>,
  } as const;
}
