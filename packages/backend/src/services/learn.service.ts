import { prisma } from '../lib/prisma';
import { toJsonInput } from '@reka-bytes/db';
import {
  AppError,
  parseBlocks,
  sanitizeBlocksForStudent,
} from '@reka-bytes/shared';
import type {
  StudentClassDTO,
  LessonDetailDTO,
  PublicQuizDTO,
  QuizSubmitResultDTO,
  LearnDashboardDTO,
} from '@reka-bytes/shared';

// ── Helpers ─────────────────────────────────────────────────────

// Mutable fresh arrays — Prisma orderBy input rejects readonly tuples
function byOrder(): Array<{ order: 'asc' }> {
  return [{ order: 'asc' }];
}

function quizSummary(quiz: {
  id: string;
  title: string;
  passingScore: number;
  required: boolean;
  _count?: { questions: number };
} | null) {
  if (!quiz) return null;
  return {
    id: quiz.id,
    title: quiz.title,
    passingScore: quiz.passingScore,
    required: quiz.required,
    questionCount: quiz._count?.questions ?? 0,
  };
}

// ── Classes (published only) ────────────────────────────────────

export async function getStudentClasses(userId: string): Promise<StudentClassDTO[]> {
  const classes = await prisma.class.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      modules: {
        orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
        include: {
          lessons: {
            orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
            include: {
              progress: { where: { userId }, select: { completedAt: true } },
            },
          },
          quiz: {
            include: { _count: { select: { questions: true } } },
          },
        },
      },
    },
  });

  return classes.map((cls) => ({
    id: cls.id,
    title: cls.title,
    description: cls.description,
    modules: cls.modules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        durationMinutes: l.durationMinutes,
        order: l.order,
        completedAt: l.progress[0]?.completedAt.toISOString() ?? null,
      })),
      // NOTE: no correctIndex anywhere in student payloads
      quiz: quizSummary(m.quiz),
    })),
  }));
}

// ── Lesson detail ───────────────────────────────────────────────

export async function getLessonDetail(lessonId: string, userId: string): Promise<LessonDetailDTO> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          class: true,
          lessons: { orderBy: byOrder(), select: { id: true } },
          quiz: { include: { _count: { select: { questions: true } } } },
        },
      },
      progress: { where: { userId }, select: { completedAt: true } },
    },
  });
  if (!lesson || !lesson.module.class.published) throw AppError.notFound('Lesson not found');

  const siblings = lesson.module.lessons;
  const idx = siblings.findIndex((l) => l.id === lessonId);

  return {
    id: lesson.id,
    title: lesson.title,
    contentMarkdown: lesson.contentMarkdown,
    // Sanitized typed blocks — correctIndex/explanation NEVER reach the student client.
    blocks: sanitizeLessonBlocks(lesson.blocks),
    videoUrl: lesson.videoUrl,
    durationMinutes: lesson.durationMinutes,
    classId: lesson.module.class.id,
    classTitle: lesson.module.class.title,
    moduleId: lesson.module.id,
    moduleTitle: lesson.module.title,
    prevLessonId: idx > 0 ? (siblings[idx - 1]?.id ?? null) : null,
    nextLessonId: idx < siblings.length - 1 ? (siblings[idx + 1]?.id ?? null) : null,
    completedAt: lesson.progress[0]?.completedAt.toISOString() ?? null,
    quiz: quizSummary(lesson.module.quiz),
  };
}

// ── Inline checks (LESSON-PLAN §8.2) ──────────────────────────

function sanitizeLessonBlocks(raw: unknown): LessonDetailDTO['blocks'] {
  if (raw === null || raw === undefined) return null;
  const blocks = parseBlocks(raw);
  return blocks.length > 0 ? sanitizeBlocksForStudent(blocks) : null;
}

export interface InlineCheckResultDTO {
  blockIndex: number;
  correct: boolean;
  /** Revealed ONLY after submit — never present in the lesson detail DTO. */
  correctIndex: number;
  explanation: string;
  /** True when this attempt covered the last unattempted inline-check in the lesson (PRD-03 §2). */
  lessonCompleted: boolean;
  /** ISO timestamp when the lesson was (auto-)completed — present only when lessonCompleted. */
  completedAt?: string;
}

/** Grade an inline check against the server-side copy of the block. Formative only — no record kept. */
export async function checkInlineAnswer(
  lessonId: string,
  userId: string,
  blockIndex: number,
  answer: number,
): Promise<InlineCheckResultDTO> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      blocks: true,
      module: { select: { class: { select: { published: true } } } },
    },
  });
  if (!lesson || !lesson.module.class.published) throw AppError.notFound('Lesson not found');

  const blocks = parseBlocks(lesson.blocks);
  const block = blocks[blockIndex];
  if (!block) throw AppError.notFound('Block not found');
  if (block.type !== 'inline-check') throw AppError.badRequest('Block is not an inline check');

  if (!Number.isInteger(answer) || answer < 0 || answer >= block.options.length) {
    throw AppError.badRequest('Answer is out of range');
  }

  const correct = answer === block.correctIndex;

  // Telemetry (PRD-03): append-only log of inline-check attempts.
  // Fire-and-forget — grading must never fail (or slow down) because logging did;
  // concurrent answers may race, losing an event is acceptable for formative data.
  void prisma.blockEvent
    .create({
      data: {
        lessonId,
        userId,
        kind: 'inline-check',
        payload: { blockIndex, answer, correct },
      },
    })
    .catch((e: unknown) =>
      console.warn('[learn] BlockEvent write failed (telemetry lost):', e instanceof Error ? e.message : e),
    );

  // Auto-complete (PRD-03 §2): the lesson completes when every inline-check in it
  // has been ATTEMPTED (right or wrong — formative engagement, not mastery). The
  // just-logged event may not be visible yet (fire-and-forget), so the current
  // blockIndex is merged into the attempted set.
  const checkIndexes = blocks.reduce<number[]>(
    (acc, b, i) => (b.type === 'inline-check' ? [...acc, i] : acc),
    [],
  );
  let lessonCompleted = false;
  let completedAt: string | undefined;
  if (checkIndexes.length > 0) {
    const events = await prisma.blockEvent.findMany({
      where: { lessonId, userId, kind: 'inline-check' },
      select: { payload: true },
    });
    const attempted = new Set(
      events.map((e) => Number((e.payload as { blockIndex?: number }).blockIndex)),
    );
    attempted.add(blockIndex);
    lessonCompleted = checkIndexes.every((i) => attempted.has(i));
    if (lessonCompleted) {
      const progress = await prisma.lessonProgress.upsert({
        where: { lessonId_userId: { lessonId, userId } },
        create: { lessonId, userId },
        update: {},
      });
      completedAt = progress.completedAt.toISOString();
    }
  }

  return {
    blockIndex,
    correct,
    correctIndex: block.correctIndex,
    explanation: block.explanation,
    lessonCompleted,
    ...(completedAt ? { completedAt } : {}),
  };
}

export async function completeLesson(lessonId: string, userId: string): Promise<{ completedAt: string }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { class: { select: { published: true } } } } },
  });
  if (!lesson || !lesson.module.class.published) throw AppError.notFound('Lesson not found');

  const progress = await prisma.lessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    create: { lessonId, userId },
    update: {},
  });
  return { completedAt: progress.completedAt.toISOString() };
}

// ── Dashboard ───────────────────────────────────────────────────

export async function getDashboard(userId: string): Promise<LearnDashboardDTO> {
  const classes = await getStudentClasses(userId);

  const allLessons = classes.flatMap((c) => c.modules.flatMap((m) => m.lessons));
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.completedAt !== null).length;

  let nextLesson: LearnDashboardDTO['nextLesson'] = null;
  const pending = allLessons.find((l) => l.completedAt === null);
  if (pending) {
    const owner = classes
      .flatMap((c) => c.modules.map((m) => ({ moduleTitle: m.title, lesson: m.lessons.find((l) => l.id === pending.id) })))
      .find((entry) => entry.lesson !== null);
    if (owner?.lesson) {
      nextLesson = {
        lessonId: owner.lesson.id,
        lessonTitle: owner.lesson.title,
        moduleTitle: owner.moduleTitle,
        durationMinutes: owner.lesson.durationMinutes,
      };
    }
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { quiz: { include: { module: { select: { title: true } } } } },
  });

  return {
    totalLessons,
    completedLessons,
    nextLesson,
    recentAttempts: attempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      quizTitle: a.quiz.title,
      moduleTitle: a.quiz.module.title,
      score: a.score,
      passed: a.passed,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

// ── Quizzes ─────────────────────────────────────────────────────

async function loadQuizForStudent(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      module: { include: { class: { select: { published: true } } } },
      questions: { orderBy: byOrder() },
    },
  });
  if (!quiz || !quiz.module.class.published) throw AppError.notFound('Quiz not found');
  return quiz;
}

/** Public quiz payload — correctIndex NEVER leaves the server pre-submit. */
export async function getPublicQuiz(quizId: string): Promise<PublicQuizDTO> {
  const quiz = await loadQuizForStudent(quizId);
  return {
    id: quiz.id,
    title: quiz.title,
    passingScore: quiz.passingScore,
    required: quiz.required,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options as string[],
    })),
  };
}

export async function submitQuiz(
  quizId: string,
  userId: string,
  answers: number[],
): Promise<QuizSubmitResultDTO> {
  const quiz = await loadQuizForStudent(quizId);
  const questions = quiz.questions;

  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw AppError.badRequest('Answers must match the number of questions');
  }

  let correctCount = 0;
  const results = questions.map((q, i) => {
    const opts = q.options as string[];
    const userAnswer = answers[i] ?? -1;
    if (!Number.isInteger(userAnswer) || userAnswer < 0 || userAnswer >= opts.length) {
      throw AppError.badRequest(`Answer ${i + 1} is out of range`);
    }
    const correct = userAnswer === q.correctIndex;
    if (correct) correctCount += 1;
    return {
      questionId: q.id,
      question: q.question,
      correct,
      userAnswer,
      correctAnswer: q.correctIndex,
      options: opts,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      score,
      passed,
      answers: toJsonInput(answers),
    },
  });

  return { score, passed, attemptId: attempt.id, results };
}
