import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  cohortCreateSchema,
  cohortUpdateSchema,
  decisionSchema,
  leadUpdateSchema,
  AppError,
} from '@reka-bytes/shared';
import { prisma } from '../lib/prisma';
import { authedUser, requireAdmin, type AppEnv } from '../middleware/auth';
import { decideApplication } from '../services/application.service';
import {
  activateCohort,
  createCohort,
  listCohorts,
  updateCohort,
} from '../services/cohort.service';
import { listLeads, updateLead } from '../services/lead.service';
import { listAllPostsAdmin } from '../services/journal.service';
import { adminStats } from './public.routes';
import { contentRoutes } from './content.routes';
import { aiRoutes } from './ai.routes';
import {
  listStudents,
  studentDetail,
  analyticsClasses,
  analyticsClassDetail,
} from '../services/admin-analytics.service';

export const adminRoutes = new Hono<AppEnv>()
  .use('*', requireAdmin)
  .get('/stats', async (c) => {
    return c.json({ data: await adminStats() });
  })
  // ── Cohorts: admin-owned capacity per intake ────────────────────────
  .get('/cohorts', async (c) => {
    return c.json({ data: await listCohorts() });
  })
  .post('/cohorts', zValidator('json', cohortCreateSchema), async (c) => {
    return c.json({ data: await createCohort(c.req.valid('json')) }, 201);
  })
  .patch('/cohorts/:id', zValidator('json', cohortUpdateSchema), async (c) => {
    return c.json({ data: await updateCohort(c.req.param('id'), c.req.valid('json')) });
  })
  .post('/cohorts/:id/activate', async (c) => {
    return c.json({ data: await activateCohort(c.req.param('id')) });
  })
  // ── Leads: company-site enquiries (start small funnel) ──────────────
  .get('/leads', async (c) => {
    return c.json({ data: await listLeads() });
  })
  .patch('/leads/:id', zValidator('json', leadUpdateSchema), async (c) => {
    return c.json({ data: await updateLead(c.req.param('id'), c.req.valid('json')) });
  })
  // ── Journal (PRD-07): read-only admin view — drafts + warnings included.
  // Editing is a commit, not a console action (see PRD-07 §3.5).
  .get('/journal', async (c) => {
    return c.json({ data: listAllPostsAdmin() });
  })
  .get('/applications', async (c) => {
    const status = c.req.query('status');
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      throw AppError.badRequest('Invalid status filter');
    }

    const applications = await prisma.application.findMany({
      where: status
        ? { user: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } }
        : undefined,
      include: {
        user: { select: { name: true, email: true, status: true } },
        cohort: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({
      data: applications.map((a) => ({
        id: a.id,
        userId: a.userId,
        cohortName: a.cohort?.name ?? null,
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
      include: {
        user: { select: { name: true, email: true, status: true } },
        cohort: { select: { name: true } },
      },
    });
    if (!application) throw AppError.notFound('Application not found');

    return c.json({
      data: {
        id: application.id,
        userId: application.userId,
        cohortName: application.cohort?.name ?? null,
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
    return c.json({
      data: await listStudents({ query: c.req.query('query'), status: c.req.query('status') }),
    });
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
