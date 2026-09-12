import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getSeats } from '../services/application.service';
import type { AdminStatsDTO } from '@reka-bytes/shared';

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
