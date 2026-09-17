import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { getSeats } from '../services/application.service';
import { createLead } from '../services/lead.service';
import {
  getFeaturedPost,
  getJournalAsset,
  getPostBySlug,
  listPosts,
} from '../services/journal.service';
import { rateLimit } from '../middleware/rate-limit';
import { leadCreateSchema, AppError, type AdminStatsDTO } from '@reka-bytes/shared';

export const publicRoutes = new Hono()
  // Remaining cohort seats — cached in redis for 15s to absorb landing-page traffic
  .get('/seats', async (c) => {
    const cacheKey = 'seats:v1';
    try {
      const { redis } = await import('../lib/redis');
      const cached = await redis.get(cacheKey);
      if (cached)
        return c.json({ data: JSON.parse(cached) as Awaited<ReturnType<typeof getSeats>> });

      const seats = await getSeats();
      await redis.set(cacheKey, JSON.stringify(seats), 'EX', 15);
      return c.json({ data: seats });
    } catch {
      // redis down → serve fresh
      return c.json({ data: await getSeats() });
    }
  })

  // Lead intake from the company-site "start small" form (no auth). Tight
  // per-minute cap: it's a human-scale form. Honeypot submissions get a fake
  // success so bots learn nothing.
  .post('/leads', rateLimit('leads'), zValidator('json', leadCreateSchema), async (c) => {
    const input = c.req.valid('json');
    if (input.website && input.website.trim().length > 0) {
      // Bot — return a plausible success without touching the database.
      return c.json({ data: { id: 'ignored' } }, 201);
    }
    const lead = await createLead(input);
    return c.json({ data: lead }, 201);
  })

  // ── Public studio journal (PRD-07) ──────────────────────────────────
  // Content is read from the repo's content/journal dir (see journal.service).
  // List order: featured first, then newest published.
  .get('/posts', async (c) => {
    return c.json({
      data: listPosts({
        page: c.req.query('page'),
        limit: c.req.query('limit'),
        tag: c.req.query('tag'),
      }),
    });
  })
  // Registered before /posts/:slug so the literal wins.
  .get('/posts/featured', async (c) => {
    return c.json({ data: getFeaturedPost() });
  })
  .get('/posts/:slug', async (c) => {
    return c.json({ data: getPostBySlug(c.req.param('slug')) });
  })
  // Journal assets — hardened widget html (served as text/plain, the renderer
  // feeds it to a sandboxed srcdoc iframe) + co-located images. Traversal +
  // extension allow-list live in getJournalAsset.
  .get('/journal-assets/*', async (c) => {
    const rel = c.req.param('*');
    if (!rel) throw AppError.notFound('Asset not found');
    const asset = getJournalAsset(rel);
    return new Response(asset.body, {
      headers: {
        'content-type': asset.contentType,
        'cache-control': 'public, max-age=300',
        'x-content-type-options': 'nosniff',
      },
    });
  });

export const adminStats = async (): Promise<AdminStatsDTO> => {
  const [, pending, rejected, totalApplications] = await Promise.all([
    prisma.user.count({ where: { status: 'APPROVED', role: 'USER' } }),
    prisma.application.count({ where: { user: { status: 'PENDING' } } }),
    prisma.application.count({ where: { user: { status: 'REJECTED' } } }),
    prisma.application.count(),
  ]);
  const seats = await getSeats();
  return { ...seats, pending, rejected, totalApplications };
};
