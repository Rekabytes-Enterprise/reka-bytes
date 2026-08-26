import { readFileSync } from 'node:fs';

/**
 * Minimal .env loader (KEY=VALUE lines) — avoids a dotenv dep in e2e.
 * Backend .env is the source of truth for ADMIN_* creds (the backend validates
 * logins against it directly), so it is loaded first; e2e/.env fills the rest.
 */
const DEFAULT_PATHS = [
  new URL('../../backend/.env', import.meta.url),
  new URL('../.env', import.meta.url),
];

export function loadEnv(paths: URL[] = DEFAULT_PATHS): void {
  for (const p of paths) {
    try {
      const raw = readFileSync(p, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
        const key = m?.[1];
        const value = m?.[2];
        if (key && value !== undefined && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch {
      // file missing — rely on exported env vars / other files
    }
  }
}
