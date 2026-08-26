import { redis } from '../../lib/redis';
import { env } from '../../env';
import { AppError } from '@reka-bytes/shared';

/**
 * Daily admin-scoped AI rate limits (PRD-02 §5.9).
 * INCR rl:ai:{key}:{yyyymmdd} + EXPIRE on first hit. Fail-open on redis error
 * (matches the existing limiter policy).
 */
export async function checkDailyLimit(key: string, limit?: number): Promise<void> {
  const cap = limit ?? (key === 'gen' ? env.AI_DAILY_GEN_LIMIT : env.AI_DAILY_REGEN_LIMIT);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const k = `rl:ai:${key}:${day}`;

  try {
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, 86400);
    if (count > cap) {
      throw AppError.rateLimited(`Daily AI limit reached (${cap}). Try again tomorrow.`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AppError') throw e;
    // redis down → fail open
  }
}
