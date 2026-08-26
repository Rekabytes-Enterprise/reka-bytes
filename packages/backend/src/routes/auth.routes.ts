import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppError, loginSchema, registerSchema } from '@reka-bytes/shared';
import { verifyPassword } from '@reka-bytes/shared/password';
import { envAdminUser, matchesEnvAdmin, ENV_ADMIN_ID } from '../lib/env-admin';
import { prisma } from '../lib/prisma';
import { authedUser, clearSessionCookie, requireAuth, setSessionCookie, type AppEnv } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { registerApplicant } from '../services/application.service';

export const authRoutes = new Hono<AppEnv>()
  .post('/register', rateLimit('register'), zValidator('json', registerSchema), async (c) => {
    const input = c.req.valid('json');
    const result = await registerApplicant(input);
    return c.json({ data: result }, 201);
  })
  .post('/login', rateLimit('login'), zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    // Env-based admin: validated directly against ADMIN_* .env vars (no DB row)
    if (matchesEnvAdmin(email, password)) {
      await setSessionCookie(c, { sub: ENV_ADMIN_ID, role: 'ADMIN' });
      return c.json({ data: envAdminUser() });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Uniform error — never reveal whether the email exists
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw AppError.unauthorized('Incorrect email or password');
    }

    await setSessionCookie(c, { sub: user.id, role: user.role });
    return c.json({
      data: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
    });
  })
  .post('/logout', async (c) => {
    clearSessionCookie(c);
    return c.json({ data: { ok: true } });
  })
  .get('/me', requireAuth, async (c) => {
    const user = authedUser(c);
    return c.json({ data: user });
  });
