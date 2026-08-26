import { z } from 'zod';
import { blocksSchema } from '../blocks';

/**
 * Structured output the AI must produce for AI Masterclass (PRD-02 §5.3).
 * Validated with zod before anything touches the database.
 */

export const generatedLessonSchema = z.object({
  title: z.string().min(1).max(200),
  contentMarkdown: z.string().min(50).max(100_000),
  durationMinutes: z.number().int().min(5).max(60),
  /** Typed block body (WriteLesson v3). Optional — legacy pipelines omit it. */
  blocks: blocksSchema.optional(),
});
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export const generatedQuizQuestionSchema = z
  .object({
    question: z.string().min(10).max(500),
    options: z.array(z.string().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
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
export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

export const generatedQuizSchema = z.object({
  title: z.string().min(1).max(200),
  passingScore: z.number().int().min(50).max(100).default(80),
  questions: z.array(generatedQuizQuestionSchema).min(1).max(10),
});
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

export const generatedModuleSchema = z.object({
  title: z.string().min(1).max(200),
  lessons: z.array(generatedLessonSchema).min(1).max(10),
  quiz: generatedQuizSchema.optional(),
});
export type GeneratedModule = z.infer<typeof generatedModuleSchema>;

export const generatedClassSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  modules: z.array(generatedModuleSchema).min(1).max(20),
});
export type GeneratedClass = z.infer<typeof generatedClassSchema>;
