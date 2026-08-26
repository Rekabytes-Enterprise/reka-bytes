import { BACKEND_URL } from './constants';
import type { ApiEnvelope } from './errors';

/** Thrown by apiFetch on any non-2xx or malformed response. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** First validation message for a field, if any — handy for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError;
}

type ApiFetchInit = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Single fetch helper used across frontend and admin.
 * - JSON in/out
 * - unwraps `{ data }` envelope
 * - throws typed ApiClientError from `{ error }` envelope
 * - same-origin path (e.g. '/api/auth/login') hits the Next.js rewrite → backend
 */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError(res.status, 'MALFORMED_RESPONSE', 'Server returned an unexpected response.');
  }

  const envelope = json as ApiEnvelope<T>;
  if ('error' in envelope && envelope.error) {
    const { code, message, details } = envelope.error;
    throw new ApiClientError(res.status, code, message, details);
  }
  if ('data' in envelope) return envelope.data;

  throw new ApiClientError(res.status, 'MALFORMED_RESPONSE', 'Server returned an unexpected response.');
}
