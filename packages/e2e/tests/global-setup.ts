import { loadEnv } from './env-loader';

/**
 * Playwright global setup — no admin seeding: admin login is validated by the
 * backend against its own .env (ADMIN_EMAIL / ADMIN_PASSWORD). We just make
 * sure the test process uses those same credentials.
 */
export default async function globalSetup() {
  loadEnv();
  console.log(`[e2e] admin login via backend .env: ${process.env.ADMIN_EMAIL ?? '(unset)'}`);
}
