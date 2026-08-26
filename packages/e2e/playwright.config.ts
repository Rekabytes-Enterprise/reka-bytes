import { defineConfig } from '@playwright/test';

const FRONT = process.env.E2E_FRONTEND_URL ?? 'http://localhost:4301';
const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:4302';
const BACK = process.env.E2E_BACKEND_URL ?? 'http://localhost:4300';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared DB state — keep deterministic ordering
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // videos + screenshots land here (gitignored)
  outputDir: './artifacts',
  globalSetup: './tests/global-setup',

  use: {
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        baseURL: FRONT,
        screenshot: { mode: 'on', fullPage: true },
      },
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter @reka-bytes/backend dev',
      url: `${BACK}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
      // Mock AI for tests: backend reads AI_MOCK from process.env (dotenv does
      // not override it), so the masterclass pipeline skips the real LLM.
      env: { AI_MOCK: '1' },
    },
    {
      command: 'pnpm --filter @reka-bytes/frontend dev',
      url: FRONT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @reka-bytes/admin dev',
      url: ADMIN,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
