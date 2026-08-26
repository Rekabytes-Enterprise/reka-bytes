import type { Context, Next } from 'hono';
import type { Env } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { AppError, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@reka-bytes/shared';
import { envAdminUser, ENV_ADMIN_ID } from '../lib/env-admin';
import { prisma } from '../lib/prisma';
import { signSession, verifySession, type SessionPayload } from '../lib/jwt';

export async function setSessionCookie(c: Context, payload: SessionPayload) {
  const token = await signSession(payload);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/** Hono env type for all routes that have an authenticated user. */
export type AppEnv = Env & { Variables: { user: AuthedUser } };

/** Resolve the authenticated user from the session cookie or throw. */
async function resolveSessionUser(c: Context): Promise<AuthedUser> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) throw AppError.unauthorized();

  const payload = await verifySession(token);
  if (!payload) throw AppError.unauthorized('Session expired or invalid');

  // Env-based admin — synthetic identity, no DB row exists
  if (payload.sub === ENV_ADMIN_ID) {
    if (payload.role !== 'ADMIN') throw AppError.unauthorized('Session expired or invalid');
    return envAdminUser();
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, status: true },
  });
  if (!user) throw AppError.unauthorized('Account no longer exists');
  return user;
}

/** Require a valid session; attaches user to context variable `user`. */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const user = await resolveSessionUser(c);
  c.set('user', user satisfies AuthedUser);
  await next();
}

/** Read the authenticated user set by requireAuth. */
export function authedUser(c: Context<AppEnv>): AuthedUser {
  return c.get('user');
}

/** Require an ADMIN role session. */
export async function requireAdmin(c: Context<AppEnv>, next: Next) {
  const user = await resolveSessionUser(c);
  if (user.role !== 'ADMIN') throw AppError.forbidden('Admin access required');
  c.set('user', user satisfies AuthedUser);
  await next();
}

/** Require an APPROVED student session (Phase 1 classroom access). */
export async function requireApproved(c: Context<AppEnv>, next: Next) {
  const user = await resolveSessionUser(c);
  if (user.status !== 'APPROVED') {
    throw AppError.forbidden('Your application has not been approved yet');
  }
  c.set('user', user satisfies AuthedUser);
  await next();
}
