'use client';

import { useEffect, useRef } from 'react';
import type { BadgeKey } from '@reka-bytes/shared';
import { fireConfetti, showXpToast } from './celebrations';

const STORAGE_KEY = 'rb-last-seen-badges';

/**
 * Celebrate newly-unlocked badges (PRD-04 §6).
 * Stateless server, client diffs against `rb-last-seen-badges` localStorage:
 * - First call (when `enabled` becomes true): persists the FULL set (no celebration)
 * - Subsequent calls: diff and fire confetti + XP toast for any NEW keys
 * - Server state remains the source of truth; localStorage is purely the
 *   "have I shown this user this badge yet?" cache
 *
 * IMPORTANT: pass `enabled=false` until the unlocked-keys list is fully loaded
 * (e.g. before dashboard data lands). Otherwise the empty-list first effect
 * writes `[]` to localStorage, then the loaded list re-fires diff for every
 * badge the user already has.
 */
export function useBadgeDiff(unlockedKeys: readonly BadgeKey[], enabled: boolean): void {
  const primed = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (!primed.current) {
      primed.current = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlockedKeys]));
      return;
    }

    const seen = new Set(readSeen());
    const newKeys = unlockedKeys.filter((k) => !seen.has(k));
    if (newKeys.length === 0) return;

    void fireConfetti();
    for (const key of newKeys) {
      const label = labelFor(key);
      showXpToast(50, { celebrate: false, label });
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlockedKeys]));
  }, [enabled, unlockedKeys.join(',')]);
}

function readSeen(): BadgeKey[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as BadgeKey[]) : [];
  } catch {
    return [];
  }
}

/** Short labels for the celebration toast — full names live in BADGES catalog. */
function labelFor(key: BadgeKey): string {
  switch (key) {
    case 'first-steps':
      return 'first steps';
    case 'module-slayer':
      return 'module slayer';
    case 'class-conqueror':
      return 'class conqueror';
    case 'halfway-there':
      return 'halfway there';
    case 'sharp-shooter':
      return 'sharp shooter';
    case 'perfect-run':
      return 'perfect run';
    case 'quiz-champion':
      return 'quiz champion';
    case 'week-warrior':
      return '7-day streak';
    case 'fortnight-flow':
      return '14-day streak';
    case 'comeback-kid':
      return 'comeback kid';
  }
}
