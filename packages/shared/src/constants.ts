/** Cross-package constants. */
export const COHORT_CAP = 5;

export const SESSION_COOKIE = 'rb_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const PORTS = {
  backend: 4300,
  frontend: 4301,
  admin: 4302,
} as const;

/**
 * Base URL for browser API calls. Defaults to '' (same-origin) so Next.js apps
 * use their /api rewrite proxy — avoids cross-port cookie issues. Set
 * NEXT_PUBLIC_BACKEND_URL only when calling the API cross-origin on purpose.
 */
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export const QUESTIONNAIRE_VERSION = 1;
