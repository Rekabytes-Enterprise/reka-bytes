/**
 * GameProfileDTO composition (PRD-04 §4). Backend aggregates raw numbers;
 * this pure function turns them into the student-facing payload so all
 * derivation logic lives in shared and is unit-testable.
 */
import { levelForXp } from './levels';
import { computeStreak, hadComeback } from './streaks';
import { evaluateBadges, type BadgeInput, type BadgeState } from './badges';

export interface GameProfileDTO {
  xp: { balance: number; level: number; intoLevel: number; forNextLevel: number };
  streak: { current: number; longest: number; activeToday: boolean };
  badges: BadgeState[];
}

/** Raw inputs the backend can cheaply aggregate. */
export interface GameProfileRaw {
  /** Sum of XpEvent.amount for the user. */
  balance: number;
  /** XpEvent ∪ BlockEvent createdAts — streak activity history. */
  activityTimestamps: readonly Date[];
  /** Everything except longestStreak/hadComeback, which are derived here. */
  badgeInput: Omit<BadgeInput, 'longestStreak' | 'hadComeback'>;
}

export function buildGameProfile(raw: GameProfileRaw): GameProfileDTO {
  const level = levelForXp(raw.balance);
  const streak = computeStreak(raw.activityTimestamps, new Date());
  const badges = evaluateBadges({
    ...raw.badgeInput,
    longestStreak: streak.longest,
    hadComeback: hadComeback(raw.activityTimestamps),
  });
  return {
    xp: { balance: Math.max(0, Math.floor(raw.balance)), ...level },
    streak,
    badges,
  };
}
