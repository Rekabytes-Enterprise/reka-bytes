/**
 * Backfill: seed XpEvent history from existing student activity (PRD-04 §4).
 *
 * Mirrors the live award rules so returning students don't start at zero:
 *   - LESSON_COMPLETED  50 XP per LessonProgress row (published classes)
 *   - MODULE_COMPLETED  +100 when every lesson of a module is done
 *                         (createdAt = latest lesson completion = moment it became true)
 *   - CLASS_COMPLETED   +250, same logic at class level
 *   - QUIZ_PASSED        100 per DISTINCT quiz with a passing attempt
 *                         (createdAt = FIRST passing attempt)
 *   - PERFECT_QUIZ       +50 per quiz with any 100% attempt (first such attempt)
 *
 * IDEMPOTENT: XpEvent.@@unique([userId, reason, refId]) + createMany skipDuplicates
 * make re-runs exact no-ops. Timestamps are COPIED from source rows so streaks
 * and badge eligibility derive from real history (PRD-04 decision table).
 *
 * Run: pnpm --filter @reka-bytes/db exec tsx scripts/xp-backfill.ts
 */
import 'dotenv/config';
import { prisma } from '../src/index';

const LESSON_XP = 50;
const MODULE_BONUS = 100;
const CLASS_BONUS = 250;
const QUIZ_PASS_XP = 100;
const PERFECT_QUIZ_BONUS = 50;

type NewXpEvent = {
  userId: string;
  amount: number;
  reason: string;
  refId: string | null;
  createdAt: Date;
};

async function main() {
  const [progresses, modules, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      select: {
        userId: true,
        lessonId: true,
        completedAt: true,
        lesson: {
          select: { moduleId: true, module: { select: { classId: true, class: { select: { published: true } } } } },
        },
      },
    }),
    prisma.module.findMany({
      where: { class: { published: true } },
      select: { id: true, classId: true, _count: { select: { lessons: true } } },
    }),
    prisma.quizAttempt.findMany({
      select: { userId: true, quizId: true, score: true, passed: true, createdAt: true },
    }),
  ]);

  const pub = progresses.filter((p) => p.lesson.module.class.published);
  console.log(`[xp-backfill] ${progresses.length} progress rows (${pub.length} in published classes)`);

  const lessonEvents: NewXpEvent[] = [];
  const moduleEvents: NewXpEvent[] = [];
  const classEvents: NewXpEvent[] = [];

  // ── lessons + module/class completion, grouped per user ──
  const byUser = new Map<string, typeof pub>();
  for (const row of pub) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const moduleLessonTotal = new Map(modules.map((m) => [m.id, m._count.lessons]));
  const classLessonTotal = new Map<string, number>();
  for (const m of modules) {
    classLessonTotal.set(m.classId, (classLessonTotal.get(m.classId) ?? 0) + m._count.lessons);
  }

  for (const [userId, rows] of byUser) {
    for (const row of rows) {
      lessonEvents.push({ userId, amount: LESSON_XP, reason: 'LESSON_COMPLETED', refId: row.lessonId, createdAt: row.completedAt });
    }

    // module completion: count per module + latest completion timestamp
    const perModule = new Map<string, { done: number; latest: Date }>();
    const perClass = new Map<string, { done: number; latest: Date }>();
    for (const row of rows) {
      for (const [map, id] of [
        [perModule, row.lesson.moduleId],
        [perClass, row.lesson.module.classId],
      ] as const) {
        const entry = map.get(id) ?? { done: 0, latest: row.completedAt };
        entry.done += 1;
        if (row.completedAt > entry.latest) entry.latest = row.completedAt;
        map.set(id, entry);
      }
    }
    for (const [moduleId, { done, latest }] of perModule) {
      if (moduleLessonTotal.get(moduleId) === done && done > 0) {
        moduleEvents.push({ userId, amount: MODULE_BONUS, reason: 'MODULE_COMPLETED', refId: moduleId, createdAt: latest });
      }
    }
    for (const [classId, { done, latest }] of perClass) {
      if (classLessonTotal.get(classId) === done && done > 0) {
        classEvents.push({ userId, amount: CLASS_BONUS, reason: 'CLASS_COMPLETED', refId: classId, createdAt: latest });
      }
    }
  }

  // ── quizzes: DISTINCT quiz per user; first passing / first perfect attempt ──
  const firstPass = new Map<string, NewXpEvent>();
  const firstPerfect = new Map<string, NewXpEvent>();
  for (const a of attempts) {
    if (a.passed) {
      const key = `${a.userId}:${a.quizId}`;
      const prev = firstPass.get(key);
      if (!prev || a.createdAt < prev.createdAt) {
        firstPass.set(key, { userId: a.userId, amount: QUIZ_PASS_XP, reason: 'QUIZ_PASSED', refId: a.quizId, createdAt: a.createdAt });
      }
    }
    if (a.score === 100) {
      const key = `${a.userId}:${a.quizId}`;
      const prev = firstPerfect.get(key);
      if (!prev || a.createdAt < prev.createdAt) {
        firstPerfect.set(key, { userId: a.userId, amount: PERFECT_QUIZ_BONUS, reason: 'PERFECT_QUIZ', refId: a.quizId, createdAt: a.createdAt });
      }
    }
  }

  const groups = [
    ['LESSON_COMPLETED', lessonEvents],
    ['MODULE_COMPLETED', moduleEvents],
    ['CLASS_COMPLETED', classEvents],
    ['QUIZ_PASSED', [...firstPass.values()]],
    ['PERFECT_QUIZ', [...firstPerfect.values()]],
  ] as const;

  let totalInserted = 0;
  for (const [reason, events] of groups) {
    if (events.length === 0) continue;
    const res = await prisma.xpEvent.createMany({ data: events, skipDuplicates: true });
    totalInserted += res.count;
    console.log(`[xp-backfill] ${reason}: ${res.count}/${events.length} inserted`);
  }

  console.log(`[xp-backfill] done — ${totalInserted} events across ${byUser.size} user(s). Re-run is a no-op.`);
}

main()
  .catch((e) => {
    console.error('[xp-backfill] failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
