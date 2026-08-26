import { test, expect } from '@playwright/test';
import { FRONT, uniqueEmail, approveStudent, cleanupUsers } from './helpers';

const PASSWORD = 'password123';

/**
 * E2E-08 · Approved student: /status → auto-redirect ≤5s → dashboard renders
 * progress ring + cohort banner. Skip button also works.
 */
test.describe('E2E-08 · status → dashboard redirect', () => {
  test('auto-redirects to /dashboard after approval', async ({ browser }) => {
    const email = uniqueEmail('dash');
    await approveStudent(email, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const page = await ctx.newPage();

    // login via UI
    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(PASSWORD);
    await page.getByTestId('login-submit').click();

    // lands on /status with the approved welcome
    await expect(page.getByTestId('status-card-APPROVED')).toBeVisible();
    await expect(page.getByTestId('status-enter-dashboard')).toBeVisible();

    // auto-redirect fires within ~6s of countdown start
    await page.waitForURL('**/dashboard', { timeout: 8_000 });
    await expect(page.getByTestId('student-dashboard')).toBeVisible();
    // Dashboard renders either the empty state (no published classes) or the
    // continue-learning card (classes exist) — both are valid post-approval.
    await expect(page.getByTestId('empty-classroom').or(page.getByTestId('continue-cta'))).toBeVisible();
  });

  test('skip button navigates immediately; no loop on return to /status', async ({ browser }) => {
    const email = uniqueEmail('skip');
    await approveStudent(email, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const page = await ctx.newPage();

    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('status-card-APPROVED')).toBeVisible();

    // skip instead of waiting
    await page.getByTestId('status-enter-dashboard').click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByTestId('student-dashboard')).toBeVisible();

    // navigating back to /status shows approved state WITHOUT a countdown (no trap)
    await page.goto('/status');
    await expect(page.getByTestId('status-card-APPROVED')).toBeVisible();
    await expect(page.getByTestId('status-enter-dashboard')).toBeVisible({ timeout: 5_000 });
    // still on /status after 6s — countdown did not restart
    await page.waitForTimeout(6_000);
    expect(new URL(page.url()).pathname).toBe('/status');

    await ctx.close();
    await cleanupUsers(email);
  });
});
