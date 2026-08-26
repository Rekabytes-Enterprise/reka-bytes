/**
 * XP → level curve (PRD-04 §3.3). Single source of truth for backend DTOs
 * AND frontend progress bars — they must never disagree.
 *
 * Cumulative XP required to REACH level n (n ≥ 2): T(n) = 50 · n · (n + 1)
 *   L1 @0 (starting level) · L2 @300 · L3 @600 · L4 @1000 · L5 @1500 …
 */

/** Cumulative XP needed to reach `level`. Level 1 is the start (0 XP). */
export function xpToReachLevel(level: number): number {
  if (!Number.isFinite(level) || level < 2) return 0;
  return 50 * level * (level + 1);
}

export interface LevelInfo {
  /** Current level, ≥ 1. */
  level: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** Total XP needed to advance from the current level to the next. */
  forNextLevel: number;
}

export function levelForXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  // Thresholds grow quadratically; a handful of iterations per call at any
  // realistic XP total. Deterministic integer math — no float edge cases.
  while (xpToReachLevel(level + 1) <= safeXp) level += 1;
  const floorXp = xpToReachLevel(level);
  return {
    level,
    intoLevel: safeXp - floorXp,
    forNextLevel: xpToReachLevel(level + 1) - floorXp,
  };
}
