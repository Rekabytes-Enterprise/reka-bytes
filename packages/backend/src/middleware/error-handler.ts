import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError, isAppError } from '@reka-bytes/shared';

/**
 * Global error handler — the ONLY place errors are formatted.
 * Every response follows the shared envelope contract:
 *   success → { data }
 *   error   → { error: { code, message, details? } }
 */
export async function errorHandler(err: unknown, c: Context) {
  // Zod validation errors → 422 with field map
  if (err instanceof ZodError) {
    const flattened = err.flatten().fieldErrors as Record<string, string[] | undefined>;
    const details: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(flattened)) {
      if (messages && messages.length > 0) details[key] = [...messages];
    }
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } },
      422,
    );
  }

  if (isAppError(err)) {
    return c.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      err.status as 400,
    );
  }

  // Unknown — log full detail server-side, never leak internals
  console.error('[unhandled]', err);
  return c.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong on our side' } },
    500,
  );
}

/** Wrap a handler so thrown errors hit the central handler (hono app.onError covers this too). */
export { AppError };
