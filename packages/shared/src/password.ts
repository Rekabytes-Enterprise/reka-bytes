import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with node:crypto scrypt — zero native deps.
 * Format: scrypt$<saltHex>$<hashHex>
 */
const KEYLEN = 64;
const COST = 16384; // scrypt N

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N: COST });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1] ?? '', 'hex');
  const expected = Buffer.from(parts[2] ?? '', 'hex');
  const actual = scryptSync(plain, salt, KEYLEN, { N: COST });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Deterministic non-reversible id for logging/analytics (never for passwords). */
export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
