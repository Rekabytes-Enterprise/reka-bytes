import { z } from 'zod';
import { blocksSchema } from '../blocks';

// ── Class ───────────────────────────────────────────────────────
export const classCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url('Cover image must be a URL').optional(),
});
export type ClassCreateInput = z.infer<typeof classCreateSchema>;

export const classUpdateSchema = classCreateSchema.partial().extend({
  published: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;

// ── Module ──────────────────────────────────────────────────────
export const moduleCreateSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(1).max(200),
});
export type ModuleCreateInput = z.infer<typeof moduleCreateSchema>;

export const moduleUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>;

// ── Lesson ──────────────────────────────────────────────────────
export const lessonCreateSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1).max(200),
  contentMarkdown: z.string().min(1, 'Lesson content is required').max(100_000),
  videoUrl: z.string().url('Video URL must be a valid URL').optional(),
  durationMinutes: z.number().int().min(1).max(120).default(10),
  /** Admin content editor may attach the typed block body. */
  blocks: blocksSchema.optional(),
});
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;

export const lessonUpdateSchema = lessonCreateSchema.omit({ moduleId: true }).partial();
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

// ── Quiz ────────────────────────────────────────────────────────
export const quizCreateSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1).max(200),
  passingScore: z.number().int().min(50).max(100).default(80),
  required: z.boolean().default(false),
});
export type QuizCreateInput = z.infer<typeof quizCreateSchema>;

export const quizUpdateSchema = quizCreateSchema.omit({ moduleId: true }).partial();
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;

// ── QuizQuestion ────────────────────────────────────────────────
const questionBase = {
  question: z.string().min(3).max(500),
  options: z.array(z.string().min(1).max(300)).min(2).max(8),
};

export const questionCreateSchema = z
  .object({
    ...questionBase,
    correctIndex: z.number().int().min(0),
  })
  .superRefine((val, ctx) => {
    if (val.correctIndex >= val.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctIndex'],
        message: 'correctIndex must point at one of the options',
      });
    }
  });
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;

// .partial() cannot be used on schemas containing superRefine — build the
// update schema from the raw base and validate cross-field at usage time.
export const questionUpdateSchema = z
  .object({
    ...questionBase,
    correctIndex: z.number().int().min(0).optional(),
  })
  .partial();
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

// ── Reorder ─────────────────────────────────────────────────────
export const reorderSchema = z.object({
  type: z.enum(['classes', 'modules', 'lessons']),
  items: z
    .array(z.object({ id: z.string().min(1), order: z.number().int().min(0) }))
    .min(1)
    .max(500),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
