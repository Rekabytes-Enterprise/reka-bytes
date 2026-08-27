import type { BadgeKey } from '@reka-bytes/shared';

/**
 * Per-badge color identity (2026-08 — user request: the badge artwork itself
 * should be colorful, not the flat lime accent).
 *
 * Hexes are chosen distinct on the dark canvas (#0a0b0d) and mirrored in the
 * glyph gradients inside badge-art.tsx. Unlocked badges render in full color
 * with a glow in their hue; locked badges render the same artwork grayscale
 * (a "statue" preview of what you'll earn) so the earned set pops.
 */
export const BADGE_COLORS: Record<BadgeKey, string> = {
  'first-steps': '#4ade80', // sprout green
  'module-slayer': '#f45b69', // crimson grip
  'class-conqueror': '#b18cff', // royal gold/purple
  'halfway-there': '#6ec1ff', // progress cyan-blue
  'sharp-shooter': '#2dd4bf', // targeting teal
  'perfect-run': '#e879f9', // flawless fuchsia
  'quiz-champion': '#facc15', // trophy gold
  'week-warrior': '#fb923c', // ember orange
  'fortnight-flow': '#f472b6', // hot-streak pink
  'comeback-kid': '#818cf8', // return indigo
};

/** `#rrggbb` → `rgba(r, g, b, a)` — tile tints + glows derived from badge hues. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
