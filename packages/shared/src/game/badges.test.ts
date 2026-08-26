import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { BADGES, evaluateBadges, unlockedBadgeKeys, type BadgeInput } from './badges';

const EMPTY: BadgeInput = {
  completedLessons: 0,
  modulesCompleted: 0,
  classesCompleted: 0,
  bestClassCompletionPct: 0,
  correctInlineChecks: 0,
  perfectQuizzes: 0,
  passedQuizCount: 0,
  longestStreak: 0,
  hadComeback: false,
};

const unlock = (patch: Partial<BadgeInput>): BadgeInput => ({ ...EMPTY, ...patch });

describe('evaluateBadges', () => {
  it('empty input locks everything', () => {
    const state = evaluateBadges(EMPTY);
    assert.equal(state.length, BADGES.length);
    assert.ok(state.every((b) => !b.unlocked));
  });

  it('thresholds unlock their badge exactly', () => {
    const cases: Array<[keyof BadgeInput, BadgeInput['completedLessons'] | number | boolean, string]> = [
      ['completedLessons', 1, 'first-steps'],
      ['modulesCompleted', 1, 'module-slayer'],
      ['classesCompleted', 1, 'class-conqueror'],
      ['bestClassCompletionPct', 50, 'halfway-there'],
      ['correctInlineChecks', 10, 'sharp-shooter'],
      ['perfectQuizzes', 1, 'perfect-run'],
      ['passedQuizCount', 5, 'quiz-champion'],
      ['longestStreak', 7, 'week-warrior'],
      ['longestStreak', 14, 'fortnight-flow'],
      ['hadComeback', true, 'comeback-kid'],
    ];
    for (const [field, value, expected] of cases) {
      const keys = unlockedBadgeKeys(unlock({ [field]: value }));
      assert.ok(keys.includes(expected as never), `${expected} should unlock via ${field}=${String(value)}`);
    }
  });

  it('below-threshold values stay locked', () => {
    const keys = unlockedBadgeKeys(
      unlock({ completedLessons: 1, correctInlineChecks: 9, bestClassCompletionPct: 49 }),
    );
    assert.deepEqual(keys, ['first-steps']);
  });

  it('preserves stable catalog order and metadata', () => {
    const state = evaluateBadges(unlock({ longestStreak: 14 }));
    assert.deepEqual(
      state.map((b) => b.key),
      BADGES.map((b) => b.key),
    );
    assert.equal(state.find((b) => b.key === 'fortnight-flow')?.unlocked, true);
    assert.ok(BADGES.every((b) => b.hint.length > 0 && b.label.length > 0));
  });
});
