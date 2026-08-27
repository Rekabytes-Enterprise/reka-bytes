/**
 * Badge catalog v1 (PRD-04 §3.5) — every badge is a pure predicate over
 * server-aggregated numbers. No unlock storage: evaluation is stateless and
 * idempotent; celebration UX diffs against localStorage client-side.
 */

export const BADGE_KEYS = [
  'first-steps',
  'module-slayer',
  'class-conqueror',
  'halfway-there',
  'sharp-shooter',
  'perfect-run',
  'quiz-champion',
  'week-warrior',
  'fortnight-flow',
  'comeback-kid',
] as const;

export type BadgeKey = (typeof BADGE_KEYS)[number];

export interface BadgeMeta {
  key: BadgeKey;
  label: string;
  /** Hint text shown while locked. */
  hint: string;
}

export const BADGES: readonly BadgeMeta[] = [
  { key: 'first-steps', label: 'First Steps', hint: 'Complete your first lesson' },
  { key: 'module-slayer', label: 'Module Slayer', hint: 'Finish every lesson in a module' },
  { key: 'class-conqueror', label: 'Class Conqueror', hint: 'Finish every lesson in a class' },
  { key: 'halfway-there', label: 'Halfway There', hint: 'Reach 50% of any class' },
  { key: 'sharp-shooter', label: 'Sharp Shooter', hint: 'Answer 10 inline checks correctly' },
  { key: 'perfect-run', label: 'Perfect Run', hint: 'Score 100% on any quiz' },
  { key: 'quiz-champion', label: 'Quiz Champion', hint: 'Pass 5 different quizzes' },
  { key: 'week-warrior', label: 'Week Warrior', hint: 'Keep a 7-day streak' },
  { key: 'fortnight-flow', label: 'Fortnight Flow', hint: 'Keep a 14-day streak' },
  { key: 'comeback-kid', label: 'Comeback Kid', hint: 'Return after taking 5+ days off' },
];

/** Numbers the backend aggregates per user — predicates stay trivially testable. */
export interface BadgeInput {
  completedLessons: number;
  /** Count of modules whose lessons are ALL complete. */
  modulesCompleted: number;
  /** Count of published classes whose lessons are ALL complete. */
  classesCompleted: number;
  /** Best single-class completion percentage, 0–100. */
  bestClassCompletionPct: number;
  /** BlockEvent count where payload.correct === true. */
  correctInlineChecks: number;
  /** Quiz attempts with score === 100. */
  perfectQuizzes: number;
  /** DISTINCT quizzes with at least one passing attempt. */
  passedQuizCount: number;
  longestStreak: number;
  hadComeback: boolean;
}

function isUnlocked(key: BadgeKey, input: BadgeInput): boolean {
  switch (key) {
    case 'first-steps':
      return input.completedLessons >= 1;
    case 'module-slayer':
      return input.modulesCompleted >= 1;
    case 'class-conqueror':
      return input.classesCompleted >= 1;
    case 'halfway-there':
      return input.bestClassCompletionPct >= 50;
    case 'sharp-shooter':
      return input.correctInlineChecks >= 10;
    case 'perfect-run':
      return input.perfectQuizzes >= 1;
    case 'quiz-champion':
      return input.passedQuizCount >= 5;
    case 'week-warrior':
      return input.longestStreak >= 7;
    case 'fortnight-flow':
      return input.longestStreak >= 14;
    case 'comeback-kid':
      return input.hadComeback;
  }
}

export interface BadgeState extends BadgeMeta {
  unlocked: boolean;
}

/** Full catalog in stable order, each with its current unlock state. */
export function evaluateBadges(input: BadgeInput): BadgeState[] {
  return BADGES.map((meta) => ({ ...meta, unlocked: isUnlocked(meta.key, input) }));
}

/** Convenience for DTOs that only carry keys of unlocked badges. */
export function unlockedBadgeKeys(input: BadgeInput): BadgeKey[] {
  return BADGES.filter((meta) => isUnlocked(meta.key, input)).map((meta) => meta.key);
}
