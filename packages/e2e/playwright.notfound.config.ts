import { defineConfig } from '@playwright/test';

// Dedicated config for specs that must NOT spawn dev servers.
//
// The main `playwright.config.ts` declares a `webServer` array that BOOTS
// backend/frontend/admin whenever they are down — fine for a human running
// the full suite, but automation is never allowed to start dev servers here.
// This override has no `webServer` and no `globalSetup`: point it at servers
// that are already running (probe :4301 first), or it fails fast instead of
// spawning anything.
//
// Run:
//   pnpm --filter @reka-bytes/e2e exec playwright test \
//     --config=playwright.notfound.config.ts tests/e2e-17-not-found.spec.ts

const FRONT = process.env.E2E_FRONTEND_URL ?? 'http://localhost:4301';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  outputDir: './artifacts',
  use: {
    // Video is the point of this spec — every test records a .webm here.
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    baseURL: FRONT,
  },
  projects: [
    {
      name: 'chromium',
      use: { screenshot: { mode: 'on', fullPage: true } },
    },
  ],
});
