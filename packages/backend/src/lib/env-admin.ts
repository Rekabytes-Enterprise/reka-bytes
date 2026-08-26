import { timingSafeEqual } from 'node:crypto';
import { env } from '../env';

/**
 * Env-based admin — credentials come from ADMIN_* env vars, no DB row.
 * Sessions for this identity use the synthetic id below.
 */
export const ENV_ADMIN_ID = 'env-admin';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Timing-safe check of login credentials against ADMIN_EMAIL / ADMIN_PASSWORD. */
export function matchesEnvAdmin(email: string, password: string): boolean {
  return (
    safeEqual(email.trim().toLowerCase(), env.ADMIN_EMAIL.trim().toLowerCase()) &&
    safeEqual(password, env.ADMIN_PASSWORD)
  );
}

/** The synthetic admin identity issued when env credentials match. */
export function envAdminUser() {
  return {
    id: ENV_ADMIN_ID,
    email: env.ADMIN_EMAIL,
    name: env.ADMIN_NAME,
    role: 'ADMIN' as const,
    status: 'APPROVED' as const,
  };
}
