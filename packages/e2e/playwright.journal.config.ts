import { defineConfig } from '@playwright/test';

// Dedicated override config for e2e-20 (journal widgets) — same discipline as
// playwright.notfound.config.ts / playwright.scenes.config.ts: NO webServer,
// NO globalSetup. The main config auto-boots backend+frontend+admin when they
// are down, which automation must never do here. Point it at servers that are
// already running (curl :4301 first) or it fails fast.
//
// Run:
//   pnpm --filter @reka-bytes/e2e exec playwright test \
//     --config=playwright.journal.config.ts tests/e2e-20-journal-widgets.spec.ts

const FRONT = process.env.E2E_FRONTEND_URL ?? 'http://localhost:4301';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  outputDir: './artifacts',
  use: {
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    baseURL: FRONT,
  },
  projects: [{ name: 'chromium', use: {} }],
});
