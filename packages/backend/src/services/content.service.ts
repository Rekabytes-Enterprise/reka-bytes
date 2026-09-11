import { prisma } from '../lib/prisma';
import { AppError, parseBlocks } from '@reka-bytes/shared';
import { Prisma, toJsonInput } from '@reka-bytes/db';
import { ENV_ADMIN_ID } from '../lib/env-admin';
import type {
  ClassTreeDTO,
  ClassSummaryDTO,
  ClassCreateInput,
  ClassUpdateInput,
  ModuleCreateInput,
  ModuleUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  QuizCreateInput,
  QuizUpdateInput,
  QuestionCreateInput,
  QuestionUpdateInput,
  ReorderInput,
} from '@reka-bytes/shared';

type Tx = Prisma.TransactionClient;

// ── Mappers ─────────────────────────────────────────────────────

function toQuestionAdmin(q: {
  id: string;
  question: string;
  options: unknown;
  correctIndex: number;
  order: number;
}) {
  return {
    id: q.id,
    question: q.question,
    options: q.options as string[],
    correctIndex: q.correctIndex,
    order: q.order,
  };
}

function toLessonDTO(l: {
  id: string;
  moduleId: string;
  title: string;
  contentMarkdown: string;
  blocks: unknown;
  videoUrl: string | null;
  durationMinutes: number;
  order: number;
}) {
  return {
    id: l.id,
    moduleId: l.moduleId,
    title: l.title,
    contentMarkdown: l.contentMarkdown,
    // Admin side sees FULL blocks incl. inline-check answers.
    blocks: parseBlocks(l.blocks),
    videoUrl: l.videoUrl,
    durationMinutes: l.durationMinutes,
    order: l.order,
  };
}

// ── Classes ─────────────────────────────────────────────────────

export async function listClasses(): Promise<ClassSummaryDTO[]> {
  const classes = await prisma.class.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      modules: {
        select: {
          _count: { select: { lessons: true } },
          quiz: { select: { id: true } },
        },
      },
    },
  });

  return classes.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    coverImage: c.coverImage,
    published: c.published,
    order: c.order,
    moduleCount: c.modules.length,
    lessonCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
    quizCount: c.modules.filter((m) => m.quiz !== null).length,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getClassTree(classId: string): Promise<ClassTreeDTO> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      modules: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          lessons: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          quiz: {
            include: { questions: { orderBy: [{ order: 'asc' as const }] } },
          },
        },
      },
    },
  });
  if (!cls) throw AppError.notFound('Class not found');

  return {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    coverImage: cls.coverImage,
    published: cls.published,
    order: cls.order,
    modules: cls.modules.map((m) => ({
      id: m.id,
      classId: m.classId,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map(toLessonDTO),
      quiz: m.quiz
        ? {
            id: m.quiz.id,
            moduleId: m.quiz.moduleId,
            title: m.quiz.title,
            passingScore: m.quiz.passingScore,
            required: m.quiz.required,
            questions: m.quiz.questions.map(toQuestionAdmin),
          }
        : null,
    })),
  };
}

async function assertPublishable(tx: Tx, classId: string) {
  const cls = await tx.class.findUnique({
    where: { id: classId },
    include: { modules: { include: { _count: { select: { lessons: true } } } } },
  });
  if (!cls) throw AppError.notFound('Class not found');
  const hasTeachableContent = cls.modules.some((m) => m._count.lessons > 0);
  if (!hasTeachableContent) {
    throw AppError.badRequest('Class needs at least one module with one lesson before publishing');
  }
}

export async function createClass(
  input: ClassCreateInput,
  actorId: string,
): Promise<ClassSummaryDTO> {
  const cls = await prisma.class.create({
    data: {
      title: input.title.trim(),
      description: input.description ?? null,
      coverImage: input.coverImage ?? null,
    },
  });
  await writeAudit(actorId, 'CLASS_CREATED', 'Class', cls.id, { title: cls.title });
  return (await listClasses()).find((c) => c.id === cls.id) as ClassSummaryDTO;
}

export async function updateClass(
  classId: string,
  input: ClassUpdateInput,
  actorId: string,
): Promise<ClassTreeDTO> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.class.findUnique({ where: { id: classId } });
    if (!existing) throw AppError.notFound('Class not found');

    if (input.published === true && !existing.published) {
      await assertPublishable(tx, classId);
    }

    await tx.class.update({
      where: { id: classId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
        ...(input.published !== undefined ? { published: input.published } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
      },
    });
    await writeAuditTx(
      tx,
      actorId,
      input.published === true ? 'CLASS_PUBLISHED' : 'CLASS_UPDATED',
      'Class',
      classId,
      {},
    );
    return getClassTree(classId);
  });
}

export async function deleteClass(classId: string, actorId: string): Promise<void> {
  const existing = await prisma.class.findUnique({ where: { id: classId } });
  if (!existing) throw AppError.notFound('Class not found');
  await prisma.$transaction(async (tx) => {
    await tx.class.delete({ where: { id: classId } });
    await writeAuditTx(tx, actorId, 'CLASS_DELETED', 'Class', classId, { title: existing.title });
  });
}

// ── Modules ─────────────────────────────────────────────────────

export async function createModule(input: ModuleCreateInput, actorId: string) {
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw AppError.notFound('Class not found');

  const maxOrder = await prisma.module.aggregate({
    where: { classId: input.classId },
    _max: { order: true },
  });

  const mod = await prisma.$transaction(async (tx) => {
    const created = await tx.module.create({
      data: {
        classId: input.classId,
        title: input.title.trim(),
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    await writeAuditTx(tx, actorId, 'MODULE_CREATED', 'Module', created.id, {
      title: created.title,
    });
    return created;
  });
  return { id: mod.id };
}

export async function updateModule(moduleId: string, input: ModuleUpdateInput) {
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing) throw AppError.notFound('Module not found');
  await prisma.module.update({
    where: { id: moduleId },
    data: input.title !== undefined ? { title: input.title.trim() } : {},
  });
  return { id: moduleId };
}

export async function deleteModule(moduleId: string, actorId: string): Promise<void> {
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing) throw AppError.notFound('Module not found');
  await prisma.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } });
    await writeAuditTx(tx, actorId, 'MODULE_DELETED', 'Module', moduleId, {
      title: existing.title,
    });
  });
}

// ── Lessons ─────────────────────────────────────────────────────

export async function createLesson(input: LessonCreateInput, actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: input.moduleId } });
  if (!mod) throw AppError.notFound('Module not found');

  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId: input.moduleId },
    _max: { order: true },
  });

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.lesson.create({
      data: {
        moduleId: input.moduleId,
        title: input.title.trim(),
        contentMarkdown: input.contentMarkdown,
        blocks: toJsonInput(input.blocks),
        videoUrl: input.videoUrl ?? null,
        durationMinutes: input.durationMinutes,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    await writeAuditTx(tx, actorId, 'LESSON_CREATED', 'Lesson', created.id, {
      title: created.title,
    });
    return created;
  });
  return { id: lesson.id };
}

export async function updateLesson(lessonId: string, input: LessonUpdateInput) {
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!existing) throw AppError.notFound('Lesson not found');
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.contentMarkdown !== undefined ? { contentMarkdown: input.contentMarkdown } : {}),
      ...(input.blocks !== undefined ? { blocks: toJsonInput(input.blocks) } : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
    },
  });
  return { id: lessonId };
}

export async function deleteLesson(lessonId: string, actorId: string): Promise<void> {
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!existing) throw AppError.notFound('Lesson not found');
  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lessonId } });
    await writeAuditTx(tx, actorId, 'LESSON_DELETED', 'Lesson', lessonId, {
      title: existing.title,
    });
  });
}

// ── Quizzes ─────────────────────────────────────────────────────

export async function createQuiz(input: QuizCreateInput, actorId: string) {
  const mod = await prisma.module.findUnique({
    where: { id: input.moduleId },
    include: { quiz: true },
  });
  if (!mod) throw AppError.notFound('Module not found');
  if (mod.quiz) throw AppError.conflict('QUIZ_EXISTS', 'This module already has a quiz');

  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        moduleId: input.moduleId,
        title: input.title.trim(),
        passingScore: input.passingScore,
        required: input.required,
        order: 0,
      },
    });
    await writeAuditTx(tx, actorId, 'QUIZ_CREATED', 'Quiz', created.id, { title: created.title });
    return created;
  });
  return { id: quiz.id };
}

export async function updateQuiz(quizId: string, input: QuizUpdateInput) {
  const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!existing) throw AppError.notFound('Quiz not found');
  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.passingScore !== undefined ? { passingScore: input.passingScore } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
    },
  });
  return { id: quizId };
}

export async function deleteQuiz(quizId: string, actorId: string): Promise<void> {
  const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!existing) throw AppError.notFound('Quiz not found');
  await prisma.$transaction(async (tx) => {
    await tx.quiz.delete({ where: { id: quizId } });
    await writeAuditTx(tx, actorId, 'QUIZ_DELETED', 'Quiz', quizId, { title: existing.title });
  });
}

// ── Questions ───────────────────────────────────────────────────

export async function createQuestion(quizId: string, input: QuestionCreateInput) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw AppError.notFound('Quiz not found');

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  const question = await prisma.quizQuestion.create({
    data: {
      quizId,
      question: input.question.trim(),
      options: toJsonInput(input.options),
      correctIndex: input.correctIndex,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  return { id: question.id };
}

export async function updateQuestion(questionId: string, input: QuestionUpdateInput) {
  const existing = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
  if (!existing) throw AppError.notFound('Question not found');

  const nextOptions = input.options ?? (existing.options as string[]);
  const nextCorrectIndex = input.correctIndex ?? existing.correctIndex;
  if (nextCorrectIndex >= nextOptions.length || nextCorrectIndex < 0) {
    throw AppError.badRequest('correctIndex must point at one of the options');
  }

  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.question !== undefined ? { question: input.question.trim() } : {}),
      ...(input.options !== undefined ? { options: toJsonInput(nextOptions) } : {}),
      ...(input.correctIndex !== undefined ? { correctIndex: nextCorrectIndex } : {}),
    },
  });
  return { id: questionId };
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const existing = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
  if (!existing) throw AppError.notFound('Question not found');
  await prisma.quizQuestion.delete({ where: { id: questionId } });
}

// ── Reorder ─────────────────────────────────────────────────────

export async function reorder(input: ReorderInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const item of input.items) {
      if (input.type === 'classes') {
        const res = await tx.class.updateMany({
          where: { id: item.id },
          data: { order: item.order },
        });
        if (res.count === 0) throw AppError.notFound(`Class ${item.id} not found`);
      } else if (input.type === 'modules') {
        const res = await tx.module.updateMany({
          where: { id: item.id },
          data: { order: item.order },
        });
        if (res.count === 0) throw AppError.notFound(`Module ${item.id} not found`);
      } else {
        const res = await tx.lesson.updateMany({
          where: { id: item.id },
          data: { order: item.order },
        });
        if (res.count === 0) throw AppError.notFound(`Lesson ${item.id} not found`);
      }
    }
  });
}

// ── Audit helpers ───────────────────────────────────────────────

function auditMeta(actorId: string, meta: Record<string, unknown>): Prisma.InputJsonValue {
  return (
    actorId === ENV_ADMIN_ID ? { ...meta, actorType: 'env-admin' } : meta
  ) as Prisma.InputJsonValue;
}

async function writeAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorId: actorId === ENV_ADMIN_ID ? null : actorId,
      action,
      targetType,
      targetId,
      meta: auditMeta(actorId, meta),
    },
  });
}

function writeAuditTx(
  tx: Tx,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown>,
) {
  return tx.auditLog.create({
    data: {
      actorId: actorId === ENV_ADMIN_ID ? null : actorId,
      action,
      targetType,
      targetId,
      meta: auditMeta(actorId, meta),
    },
  });
}
