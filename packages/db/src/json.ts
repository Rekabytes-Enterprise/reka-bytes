import type { Prisma } from './generated/prisma/client';

/**
 * Runtime-validated conversion of arbitrary parsed data to Prisma JSON input.
 *
 * - `undefined` → returns `undefined` (so call sites can pass `blocks ?? undefined` directly)
 * - `null` → returns `null`
 * - objects/arrays → JSON round-trip guarantees dates→ISO strings and strips undefined/fn/symbol;
 *   result is a plain serialisable value assignable to Prisma.InputJsonValue
 *
 * The single cast inside this function is the ONE audited double-cast path in the
 * codebase (see eslint `no-restricted-syntax` rule). If this helper ever needs to
 * change, the cast must be reviewed alongside the lint rule.
 */
export function toJsonInput(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return undefined as unknown as Prisma.InputJsonValue;
  // JSON.stringify ignores undefined in arrays/objects but returns undefined for the value itself
  const str = JSON.stringify(value);
  if (str === undefined) return undefined as unknown as Prisma.InputJsonValue;
  return JSON.parse(str) as Prisma.InputJsonValue;
}
