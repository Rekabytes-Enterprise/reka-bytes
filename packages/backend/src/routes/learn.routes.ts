import { Hono } from 'hono';
import type { AppEnv } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authedUser, requireApproved } from '../middleware/auth';
import { ENV_ADMIN_ID } from '../lib/env-admin';
import { AppError } from '@reka-bytes/shared';
import {
  getStudentClasses,
  getLessonDetail,
  completeLesson,
  checkInlineAnswer,
  getDashboard,
  getPublicQuiz,
  submitQuiz,
} from '../services/learn.service';

/**
 * Student learn routes (PRD-02 §10.1).
 * Every route requires an APPROVED session — userId always comes from the
 * session (never the body), so students can only ever touch their own data.
 *
 * The synthetic env-admin (no DB row) is blocked from PROGRESS WRITES — any
 * LessonProgress/BlockEvent insert would FK-fail (PRD-03 §3.5). Reading stays
 * allowed so admins can preview lessons.
 */
function requireRealStudent(c: Parameters<typeof authedUser>[0]): { id: string } {
  const user = authedUser(c);
  if (user.id === ENV_ADMIN_ID) {
    throw AppError.forbidden('Student account required — the env admin has no progress tracking');
  }
  return user;
}

export const learnRoutes = new Hono<AppEnv>()
  .use('*', requireApproved)
  .get('/classes', async (c) => {
    const user = authedUser(c);
    return c.json({ data: await getStudentClasses(user.id) });
  })
  .get('/dashboard', async (c) => {
    const user = authedUser(c);
    return c.json({ data: await getDashboard(user.id) });
  })
  .get('/lessons/:id', async (c) => {
    const user = authedUser(c);
    return c.json({ data: await getLessonDetail(c.req.param('id'), user.id) });
  })
  .post('/lessons/:id/complete', async (c) => {
    const user = requireRealStudent(c);
    return c.json({ data: await completeLesson(c.req.param('id'), user.id) });
  })
  // Inline-check grading (LESSON-PLAN §8.2): answers live server-side until submit.
  .post(
    '/lessons/:id/check',
    zValidator(
      'json',
      z.object({
        blockIndex: z.number().int().min(0).max(200),
        answer: z.number().int().min(0).max(7),
      }),
    ),
    async (c) => {
      const user = requireRealStudent(c);
      const { blockIndex, answer } = c.req.valid('json');
      return c.json({
        data: await checkInlineAnswer(c.req.param('id'), user.id, blockIndex, answer),
      });
    },
  )
  .get('/quizzes/:id', async (c) => c.json({ data: await getPublicQuiz(c.req.param('id')) }))
  .post(
    '/quizzes/:id/submit',
    zValidator('json', z.object({ answers: z.array(z.number().int().min(0)) })),
    async (c) => {
      const user = requireRealStudent(c);
      const { answers } = c.req.valid('json');
      return c.json({ data: await submitQuiz(c.req.param('id'), user.id, answers) });
    },
  );
