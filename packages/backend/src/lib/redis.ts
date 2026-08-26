import Redis from 'ioredis';
import { env } from '../env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
});

redis.on('error', (err) => {
  // Fail-open policy: rate limiting degrades gracefully if redis is down.
  console.warn('[redis] error (rate-limiting degraded):', err.message);
});
