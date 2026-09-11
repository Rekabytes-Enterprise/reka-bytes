/**
 * Admin students & analytics (PRD-03 §3.3–3.4).
 *
 * Aggregations are deliberately simple: group-bys over LessonProgress /
 * QuizAttempt / BlockEvent + in-JS joins for JSON payloads (blockIndex,
 * per-question correctness). Current scale (single cohort) makes this a
 * non-issue; revisit with SQL aggregates if it ever isn't.
 */
import { prisma } from '../lib/prisma';
import { AppError } from '@reka-bytes/shared';
import type {
  AnalyticsClassDetailDTO,
  AnalyticsClassListItemDTO,
  AnalyticsCheckStatDTO,
  AnalyticsLessonDTO,
  AnalyticsQuizQuestionStatDTO,
  StudentCheckEventDTO,
  StudentDetailDTO,
  StudentListItemDTO,
  StudentLessonProgressDTO,
  StudentQuizAttemptDTO,
  UserStatus,
} from '@reka-bytes/shared';

// ── Students ────────────────────────────────────────────────────

export async function listStudents(opts: {
  query?: string;
  status?: string;
}): Promise<StudentListItemDTO[]> {
  const status = opts.status && opts.status !== 'ALL' ? (opts.status as UserStatus) : undefined;
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      ...(status ? { status } : {}),
      ...(opts.query
        ? {
            OR: [
              { name: { contains: opts.query, mode: 'insensitive' as const } },
              { email: { contains: opts.query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const [progressCounts, quizAgg, checkLatest] = await Promise.all([
    prisma.lessonProgress.groupBy({ by: ['userId'], _count: { _all: true } }),
    prisma.quizAttempt.groupBy({
      by: ['userId'],
      _count: { _all: true },
      _avg: { score: true },
      _max: { createdAt: true },
    }),
    prisma.blockEvent.groupBy({ by: ['userId'], _max: { createdAt: true } }),
  ]);

  const progressMap = new Map(progressCounts.map((p) => [p.userId, p._count._all]));
  const quizMap = new Map(quizAgg.map((q) => [q.userId, q]));
  const checkMap = new Map(checkLatest.map((c) => [c.userId, c._max.createdAt]));

  return users.map((u) => {
    const quiz = quizMap.get(u.id);
    const dates = [quiz?._max.createdAt ?? null, checkMap.get(u.id) ?? null].filter(
      Boolean,
    ) as Date[];
    const last = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      joinedAt: u.createdAt.toISOString(),
      lessonsCompleted: progressMap.get(u.id) ?? 0,
      quizAttempts: quiz?._count._all ?? 0,
      avgQuizScore: quiz?._avg.score != null ? Math.round(quiz._avg.score) : null,
      lastActivityAt: last ? last.toISOString() : null,
    };
  });
}

export async function studentDetail(userId: string): Promise<StudentDetailDTO> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, status: true, createdAt: true, role: true },
  });
  if (!user) throw AppError.notFound('Student not found');

  const [progress, attempts, checks] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: {
        completedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { title: true, class: { select: { title: true } } } },
          },
        },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        score: true,
        passed: true,
        createdAt: true,
        quiz: { select: { title: true, module: { select: { title: true } } } },
      },
    }),
    prisma.blockEvent.findMany({
      where: { userId, kind: 'inline-check' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { payload: true, createdAt: true, lesson: { select: { title: true } } },
    }),
  ]);

  const progressDTOs: StudentLessonProgressDTO[] = progress.map((p) => ({
    lessonId: p.lesson.id,
    lessonTitle: p.lesson.title,
    classTitle: p.lesson.module.class.title,
    moduleTitle: p.lesson.module.title,
    completedAt: p.completedAt.toISOString(),
  }));

  const attemptDTOs: StudentQuizAttemptDTO[] = attempts.map((a) => ({
    id: a.id,
    quizTitle: a.quiz.title,
    moduleTitle: a.quiz.module.title,
    score: a.score,
    passed: a.passed,
    createdAt: a.createdAt.toISOString(),
  }));

  const checkDTOs: StudentCheckEventDTO[] = checks.map((c) => {
    const payload = c.payload as { blockIndex?: number; correct?: boolean };
    return {
      lessonTitle: c.lesson.title,
      blockIndex: Number(payload.blockIndex ?? -1),
      correct: Boolean(payload.correct),
      createdAt: c.createdAt.toISOString(),
    };
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    joinedAt: user.createdAt.toISOString(),
    lessonsCompleted: progress.length,
    progress: progressDTOs,
    quizAttempts: attemptDTOs,
    recentChecks: checkDTOs,
  };
}

// ── Analytics ───────────────────────────────────────────────────

export async function analyticsClasses(): Promise<AnalyticsClassListItemDTO[]> {
  const classes = await prisma.class.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      published: true,
      modules: {
        select: {
          lessons: { select: { id: true } },
          quiz: { select: { id: true, attempts: { select: { score: true, passed: true } } } },
        },
      },
    },
  });

  const lessonIds = classes.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const progressGrouped = lessonIds.length
    ? await prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: { lessonId: { in: lessonIds } },
        _count: { _all: true },
      })
    : [];
  const progressByLesson = new Map(progressGrouped.map((p) => [p.lessonId, p._count._all]));

  return classes.map((c) => {
    const lessonCount = c.modules.reduce((s, m) => s + m.lessons.length, 0);
    const completionCount = c.modules.reduce(
      (s, m) => s + m.lessons.reduce((ls, l) => ls + (progressByLesson.get(l.id) ?? 0), 0),
      0,
    );
    const attempts = c.modules.flatMap((m) => m.quiz?.attempts ?? []);
    const avg =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : null;
    const passRate =
      attempts.length > 0
        ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
        : null;
    return {
      id: c.id,
      title: c.title,
      published: c.published,
      lessonCount,
      completionCount,
      quizAttempts: attempts.length,
      avgQuizScore: avg,
      passRate,
    };
  });
}

export async function analyticsClassDetail(classId: string): Promise<AnalyticsClassDetailDTO> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          title: true,
          lessons: {
            orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
            select: { id: true, title: true, blocks: true },
          },
          quiz: {
            select: {
              id: true,
              title: true,
              questions: {
                orderBy: { order: 'asc' },
                select: { id: true, question: true, correctIndex: true },
              },
              attempts: { select: { answers: true } },
            },
          },
        },
      },
    },
  });
  if (!cls) throw AppError.notFound('Class not found');

  const allLessonIds = cls.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressGrouped = allLessonIds.length
    ? await prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: { lessonId: { in: allLessonIds } },
        _count: { _all: true },
      })
    : [];
  const progressByLesson = new Map(progressGrouped.map((p) => [p.lessonId, p._count._all]));

  // BlockEvent stats per (lesson, blockIndex) — one query for the whole class.
  const events = allLessonIds.length
    ? await prisma.blockEvent.findMany({
        where: { lessonId: { in: allLessonIds }, kind: 'inline-check' },
        select: { lessonId: true, payload: true },
      })
    : [];
  type Key = string; // `${lessonId}:${blockIndex}`
  const checkAgg = new Map<Key, { attempts: number; correct: number }>();
  for (const e of events) {
    const payload = e.payload as { blockIndex?: number; correct?: boolean };
    if (typeof payload.blockIndex !== 'number') continue;
    const key: Key = `${e.lessonId}:${payload.blockIndex}`;
    const agg = checkAgg.get(key) ?? { attempts: 0, correct: 0 };
    agg.attempts += 1;
    if (payload.correct) agg.correct += 1;
    checkAgg.set(key, agg);
  }

  const lessons: AnalyticsLessonDTO[] = cls.modules.flatMap((m) =>
    m.lessons.map((l) => {
      const blocks = Array.isArray(l.blocks)
        ? (l.blocks as Array<{ type?: string; question?: string }>)
        : [];
      const checks: AnalyticsCheckStatDTO[] = blocks
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b?.type === 'inline-check')
        .map(({ b, i }) => {
          const agg = checkAgg.get(`${l.id}:${i}`);
          return {
            lessonId: l.id,
            lessonTitle: l.title,
            blockIndex: i,
            question: b.question ?? '(untitled check)',
            attempts: agg?.attempts ?? 0,
            correctCount: agg?.correct ?? 0,
            percentCorrect:
              agg && agg.attempts > 0 ? Math.round((agg.correct / agg.attempts) * 100) : null,
          };
        });
      return {
        lessonId: l.id,
        lessonTitle: l.title,
        moduleTitle: m.title,
        completedCount: progressByLesson.get(l.id) ?? 0,
        checks,
      };
    }),
  );

  // Per-quiz-question correctness: join attempt answers with question keys.
  const quizQuestions: AnalyticsQuizQuestionStatDTO[] = [];
  for (const m of cls.modules) {
    if (!m.quiz) continue;
    const { questions, attempts, id, title } = m.quiz;
    const perQuestion = questions.map((q) => ({
      id: q.id,
      question: q.question,
      attempts: 0,
      correct: 0,
    }));
    for (const a of attempts) {
      const answers = Array.isArray(a.answers) ? (a.answers as number[]) : [];
      answers.forEach((chosen, qi) => {
        const stat = perQuestion[qi];
        if (!stat) return;
        stat.attempts += 1;
        if (chosen === questions[qi]?.correctIndex) stat.correct += 1;
      });
    }
    for (const stat of perQuestion) {
      quizQuestions.push({
        quizId: id,
        quizTitle: title,
        questionId: stat.id,
        question: stat.question,
        attempts: stat.attempts,
        percentCorrect: stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : null,
      });
    }
  }

  return { id: cls.id, title: cls.title, lessons, quizQuestions };
}
