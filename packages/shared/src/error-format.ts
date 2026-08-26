/**
 * Pure (non-React) error-to-toast formatter.
 * Consumes both ApiClientError (frontend/admin network layer) and AppError (backend).
 * Both have the same shape: { status, code, message, details }.
 */
import { ApiClientError } from './api';

export interface FormattedError {
  title: string;
  description?: string;
}

/** Returns a human-readable title + optional description from any thrown error.
 *
 * Priority:
 * 1. ApiClientError / AppError — title = message, description = "CODE (status)" + first detail entry
 * 2. plain Error — title = message
 * 3. non-Error — falls back to `fallback` string
 */
export function formatApiError(
  error: unknown,
  fallback = 'Something went wrong',
): FormattedError {
  if (error instanceof ApiClientError) {
    const detail = error.details
      ? Object.entries(error.details)[0]
      : undefined;
    return {
      title: error.message || fallback,
      description: detail
        ? `${error.code} (${error.status}) · ${detail[0]}: ${detail[1][0]}`
        : `${error.code} (${error.status})`,
    };
  }

  if (error instanceof Error) {
    return { title: error.message || fallback };
  }

  return { title: fallback };
}
