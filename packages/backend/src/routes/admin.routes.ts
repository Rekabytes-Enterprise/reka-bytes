import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { decisionSchema, AppError } from '@reka-bytes/shared';
import { prisma } from '../lib/prisma';
import { authedUser, requireAdmin, type AppEnv } from '../middleware/auth';
import { decideApplication } from '../services/application.service';
import { adminStats } from './public.routes';
import { contentRoutes } from './content.routes';
import { aiRoutes } from './ai.routes';
import { listStudents, studentDetail, analyticsClasses, analyticsClassDetail } from '../services/admin-analytics.service';

export const adminRoutes = new Hono<AppEnv>()
  .use('*', requireAdmin)
  .get('/stats', async (c) => {
    return c.json({ data: await adminStats() });
  })
  .get('/applications', async (c) => {
    const status = c.req.query('status');
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      throw AppError.badRequest('Invalid status filter');
    }

    const applications = await prisma.application.findMany({
      where: status ? { user: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } } : undefined,
      include: { user: { select: { name: true, email: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({
      data: applications.map((a) => ({
        id: a.id,
        userId: a.userId,
        schemaVersion: a.schemaVersion,
        answers: a.answers as Record<string, unknown>,
        internalNote: a.internalNote,
        decidedAt: a.decidedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        user: a.user,
      })),
    });
  })
  .get('/applications/:id', async (c) => {
    const id = c.req.param('id');
    const application = await prisma.application.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true, status: true } } },
    });
    if (!application) throw AppError.notFound('Application not found');

    return c.json({
      data: {
        id: application.id,
        userId: application.userId,
        schemaVersion: application.schemaVersion,
        answers: application.answers as Record<string, unknown>,
        internalNote: application.internalNote,
        decidedAt: application.decidedAt?.toISOString() ?? null,
        createdAt: application.createdAt.toISOString(),
        user: application.user,
      },
    });
  })
  .patch('/applications/:id/decision', zValidator('json', decisionSchema), async (c) => {
    const admin = authedUser(c);
    const input = c.req.valid('json');

    const result = await decideApplication({
      applicationId: c.req.param('id'),
      decision: input.decision,
      internalNote: input.internalNote,
      adminId: admin.id,
    });

    return c.json({ data: result });
  })
  .route('/', contentRoutes)
  .route('/ai', aiRoutes)
  // Students & analytics (PRD-03 §3.3–3.4)
  .get('/students', async (c) => {
    return c.json({ data: await listStudents({ query: c.req.query('query'), status: c.req.query('status') }) });
  })
  .get('/students/:id', async (c) => {
    return c.json({ data: await studentDetail(c.req.param('id')) });
  })
  .get('/analytics/classes', async (c) => {
    return c.json({ data: await analyticsClasses() });
  })
  .get('/analytics/class/:id', async (c) => {
    return c.json({ data: await analyticsClassDetail(c.req.param('id')) });
  });
