/**
 * Streak computation over activity timestamps (PRD-04 §3.4).
 * Pure + UTC-only (v1 caveat): callers pass Date objects from XpEvent ∪ BlockEvent.
 */

const DAY_MS = 86_400_000;

/** UTC calendar-day key: 'YYYY-MM-DD'. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function keyToUtcMs(key: string): number {
  return Date.parse(`${key}T00:00:00.000Z`);
}

export interface StreakInfo {
  /**
   * Consecutive active days ending today or yesterday. The yesterday grace
   * means yesterday's activity still shows a live streak until the day ends.
   */
  current: number;
  longest: number;
  /** Any activity recorded today (UTC). Drives the streak card's lit/dim state. */
  activeToday: boolean;
}

export function computeStreak(timestamps: readonly Date[], now: Date): StreakInfo {
  const days = new Set<string>();
  for (const ts of timestamps) {
    if (Number.isFinite(ts.getTime())) days.add(dayKey(ts));
  }

  const todayMs = keyToUtcMs(dayKey(now));
  const activeToday = days.has(dayKey(now));
  const activeYesterday = days.has(new Date(todayMs - DAY_MS).toISOString().slice(0, 10));

  // ── current streak: walk back from anchor (today if active, else yesterday) ──
  let current = 0;
  if (activeToday || activeYesterday) {
    const anchorOffset = activeToday ? 0 : 1;
    let cursor = todayMs - anchorOffset * DAY_MS;
    while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
      current += 1;
      cursor -= DAY_MS;
    }
  }

  // ── longest streak: max consecutive run across all history ──
  const sortedMs = [...days].map(keyToUtcMs).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const ms of sortedMs) {
    run = ms - prev === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = ms;
  }

  return { current, longest, activeToday };
}

/**
 * Comeback detection (badge predicate input): true when the user has ≥5 idle
 * days between two active days AND returned after that gap.
 */
export function hadComeback(timestamps: readonly Date[]): boolean {
  const sortedMs = [...new Set([...timestamps].filter((t) => Number.isFinite(t.getTime())).map(dayKey))]
    .map(keyToUtcMs)
    .sort((a, b) => a - b);
  for (let i = 1; i < sortedMs.length; i += 1) {
    if (sortedMs[i]! - sortedMs[i - 1]! >= 5 * DAY_MS) return true;
  }
  return false;
}
