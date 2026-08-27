import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppError, loginSchema } from '@reka-bytes/shared';
import { envAdminUser, matchesEnvAdmin, ENV_ADMIN_ID } from '../lib/env-admin';
import { rateLimit } from '../middleware/rate-limit';
import { setSessionCookie, type AppEnv } from '../middleware/auth';

/**
 * Dedicated UNAUTHENTICATED entry point for the synthetic env-admin identity
 * (credentials = backend .env ADMIN_EMAIL / ADMIN_PASSWORD, no DB row).
 *
 * Only the admin console calls this. The shared POST /api/auth/login used to
 * carry this fallback — reachable from the student login form too, which let
 * admin credentials mint an ADMIN session on the student frontend (2026-08
 * session-leak incident). Student surfaces now physically cannot obtain an
 * env-admin session.
 */
export const adminAuthRoutes = new Hono<AppEnv>().post(
  '/login',
  rateLimit('admin-login'),
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json');

    // Uniform error — never reveal whether the credential half-matched
    if (!matchesEnvAdmin(email, password)) {
      throw AppError.unauthorized('Incorrect email or password');
    }

    await setSessionCookie(c, { sub: ENV_ADMIN_ID, role: 'ADMIN' });
    return c.json({ data: envAdminUser() });
  },
);
