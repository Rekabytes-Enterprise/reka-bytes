import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { getSeats } from '../services/application.service';
import { createLead } from '../services/lead.service';
import { rateLimit } from '../middleware/rate-limit';
import { leadCreateSchema, type AdminStatsDTO } from '@reka-bytes/shared';

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
