import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computeStreak, hadComeback } from './streaks';

const DAY_MS = 86_400_000;
/** Fixed "now": 2026-08-26 is a Wednesday, nothing special about it — pure UTC math. */
const NOW = new Date('2026-08-26T12:00:00.000Z');
const dayAt = (daysAgo: number): Date => new Date(NOW.getTime() - daysAgo * DAY_MS);

describe('computeStreak', () => {
  it('empty history', () => {
    assert.deepEqual(computeStreak([], NOW), { current: 0, longest: 0, activeToday: false });
  });

  it('today only', () => {
    assert.deepEqual(computeStreak([dayAt(0)], NOW), { current: 1, longest: 1, activeToday: true });
  });

  it('yesterday grace keeps the streak alive without today activity', () => {
    const info = computeStreak([dayAt(1)], NOW);
    assert.equal(info.current, 1);
    assert.equal(info.activeToday, false);
  });

  it('counts a run ending today', () => {
    const stamps = [0, 1, 2, 3, 4].map(dayAt);
    assert.deepEqual(computeStreak(stamps, NOW), { current: 5, longest: 5, activeToday: true });
  });

  it('a gap splits current from longest', () => {
    // Active days: -10..-7 (run of 4), then -1 and today (run of 2).
    const stamps = [10, 9, 8, 7, 1, 0].map(dayAt);
    assert.deepEqual(computeStreak(stamps, NOW), { current: 2, longest: 4, activeToday: true });
  });

  it('stale streak (>48h since last activity) reads zero', () => {
    const info = computeStreak([dayAt(3), dayAt(4)], NOW);
    assert.equal(info.current, 0);
    assert.equal(info.longest, 2);
  });

  it('multiple same-day events collapse to one day', () => {
    const stamps = [
      new Date('2026-08-26T01:00:00.000Z'),
      new Date('2026-08-26T09:00:00.000Z'),
      new Date('2026-08-26T20:00:00.000Z'),
    ];
    assert.equal(computeStreak(stamps, NOW).current, 1);
  });

  it('ignores invalid timestamps', () => {
    assert.deepEqual(computeStreak([new Date('not-a-date')], NOW), {
      current: 0,
      longest: 0,
      activeToday: false,
    });
  });
});

describe('hadComeback', () => {
  it('false with no gap or no history', () => {
    assert.equal(hadComeback([]), false);
    assert.equal(hadComeback([dayAt(1), dayAt(2)]), false);
  });
  it('true when a ≥5-day gap was followed by a return', () => {
    assert.equal(hadComeback([dayAt(30), dayAt(31), dayAt(3)]), true);
  });
  it('4-day gap does not count', () => {
    assert.equal(hadComeback([dayAt(5), dayAt(1)]), false);
  });
});
