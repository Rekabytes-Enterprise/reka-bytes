/** Canonical error codes shared across backend, frontend, and admin. */
export const ERROR_CODES = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Machine-readable domain codes for specific business errors. */
export const DOMAIN_ERRORS = {
  COHORT_FULL: 'COHORT_FULL',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export type DomainError = keyof typeof DOMAIN_ERRORS;

/** Single error type used by every package. Never throw raw strings. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: Record<string, string[]>) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(code: DomainError | string, message: string) {
    return new AppError(409, code, message);
  }
  static rateLimited(message = 'Too many requests, slow down') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
  static validation(details: Record<string, string[]>, message = 'Validation failed') {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }
  static internal(message = 'Something went wrong on our side') {
    return new AppError(500, 'INTERNAL', message);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type SuccessEnvelope<T> = { data: T };

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;
