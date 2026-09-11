import { sign, verify } from 'hono/jwt';
import { SESSION_TTL_SECONDS } from '@reka-bytes/shared';
import type { Role } from '@reka-bytes/db';
import { env } from '../env';

export interface SessionPayload {
  sub: string;
  role: Role;
}

interface JwtClaims {
  sub?: unknown;
  role?: unknown;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return sign(
    {
      sub: payload.sub,
      role: payload.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    env.JWT_SECRET,
  );
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const claims = (await verify(token, env.JWT_SECRET, 'HS256')) as JwtClaims;
    if (!claims.sub || typeof claims.sub !== 'string') return null;
    if (claims.role !== 'USER' && claims.role !== 'ADMIN') return null;
    return { sub: claims.sub, role: claims.role };
  } catch {
    return null;
  }
}
