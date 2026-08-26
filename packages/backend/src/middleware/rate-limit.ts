import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { AppError } from '@reka-bytes/shared';
import { redis } from '../lib/redis';
import { env } from '../env';

/**
 * Redis-backed fixed-window rate limiter. Fails OPEN if redis is unreachable
 * (dev resilience) — swap to fail-closed in production by changing the catch.
 */
export function rateLimit(scope: string, perMinute = env.RATE_LIMIT_PER_MINUTE): MiddlewareHandler {
  return async (c, next) => {
    const info = getConnInfo(c);
    const ip = info?.remote?.address ?? 'unknown';
    const key = `rl:${scope}:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, 60_000);
      if (count > perMinute) {
        throw AppError.rateLimited();
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AppError') throw e;
      // redis down → fail open
    }
    await next();
  };
}
