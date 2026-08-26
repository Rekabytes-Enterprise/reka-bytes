import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppError } from '@reka-bytes/shared';
import { authedUser, type AppEnv } from '../middleware/auth';
import { createJob, getJob, toStatusDTO } from '../services/ai/jobs';
import { checkDailyLimit } from '../services/ai/daily-limit';
import {
  runGeneration,
  resumeGeneration,
  regenerateOutline,
  regenerateLesson,
  regenerateQuizQuestions,
} from '../services/ai/masterclass.service';
import { assertPdf, saveUpload } from '../services/ai/extract';
import { getClassTree, updateClass } from '../services/content.service';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * AI Masterclass routes (PRD-02 §10.3).
 * Mounted under adminRoutes → inherits requireAdmin. No own guard.
 */
export const aiRoutes = new Hono<AppEnv>()
  .post('/masterclass/generate', async (c) => {
    await checkDailyLimit('gen');

    const contentLength = Number(c.req.header('content-length') ?? '0');
    if (contentLength > MAX_UPLOAD_BYTES + 1024) {
      throw AppError.badRequest('File too large — 50MB max');
    }

    let file: File | undefined;
    let classTitle = '';
    try {
      const body = await c.req.parseBody();
      const rawFile = body['file'];
      if (rawFile instanceof File) file = rawFile;
      if (typeof body['classTitle'] === 'string') classTitle = body['classTitle'].trim();
    } catch {
      throw AppError.badRequest('Expected multipart form-data with a PDF file');
    }

    if (!file || !(file instanceof File)) throw AppError.badRequest('A PDF file is required');
    if (!classTitle) throw AppError.badRequest('Class title is required');
    if (file.size > MAX_UPLOAD_BYTES) throw AppError.badRequest('File too large — 50MB max');

    const buffer = Buffer.from(await file.arrayBuffer());
    assertPdf(buffer); // magic-byte check
    const filePath = await saveUpload(buffer);

    // Fire-and-forget: route returns immediately, job tracks progress in redis.
    // Phase 1 only (analyze → outline) — the job pauses at the outline
    // checkpoint until the admin approves via /approve/:jobId.
    const job = createJob(classTitle, process.env.AI_MOCK === '1' ? null : filePath);
    void runGeneration(job, job.uploadPath).catch(() => undefined);

    return c.json({ data: { jobId: job.jobId } }, 202);
  })
  .get('/masterclass/status/:jobId', async (c) =>
    c.json({ data: toStatusDTO(await getJob(c.req.param('jobId'))) }),
  )
  .post('/masterclass/approve/:jobId', async (c) => {
    const job = await getJob(c.req.param('jobId'));
    if (job.status !== 'awaiting_approval') {
      throw AppError.badRequest('Job is not awaiting outline approval');
    }
    // Fire-and-forget phase 2: lessons → quizzes → persist.
    void resumeGeneration(job.jobId).catch(() => undefined);
    return c.json({ data: { ok: true } }, 202);
  })
  .post('/masterclass/regenerate-outline/:jobId', async (c) => {
    await checkDailyLimit('regen');
    return c.json({ data: { outline: await regenerateOutline(c.req.param('jobId')) } });
  })
  .get('/masterclass/preview/:classId', async (c) =>
    c.json({ data: await getClassTree(c.req.param('classId')) }),
  )
  .post(
    '/masterclass/regenerate-lesson/:lessonId',
    zValidator('json', z.object({ jobId: z.string().min(1).optional() }).optional()),
    async (c) => {
      await checkDailyLimit('regen');
      const { jobId } = c.req.valid('json') ?? {};
      return c.json({ data: { contentMarkdown: await regenerateLesson(c.req.param('lessonId'), jobId) } });
    },
  )
  .post('/masterclass/regenerate-quiz/:quizId', async (c) => {
    await checkDailyLimit('regen');
    return c.json({ data: { questions: await regenerateQuizQuestions(c.req.param('quizId')) } });
  })
  .post(
    '/masterclass/confirm',
    zValidator('json', z.object({ classId: z.string().min(1), publish: z.boolean() })),
    async (c) => {
      const { classId, publish } = c.req.valid('json');
      await updateClass(classId, { published: publish }, authedUser(c).id);
      return c.json({ data: await getClassTree(classId) });
    },
  );
