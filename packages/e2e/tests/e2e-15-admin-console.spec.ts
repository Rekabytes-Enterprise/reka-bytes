import { test, expect } from '@playwright/test';
import { ADMIN, adminLoginCookie, seedClassroom, cleanupClassroom } from './helpers';
import { pgClient } from './db';

/**
 * E2E-15 · Admin console smoke (PRD-03): sidebar shell, Students directory,
 * Analytics page. Runs against dev servers; admin = backend .env creds.
 */
test.describe('E2E-15 · admin console', () => {
  let cookie = '';

  test.beforeAll(async () => {
    cookie = await adminLoginCookie();
  });

  test('sidebar + students directory', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: ADMIN });
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    // Sidebar renders on a console page
    await page.goto('/students');
    await expect(page.getByTestId('admin-nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('admin-nav-students')).toBeVisible();
    await expect(page.getByTestId('admin-nav-analytics')).toBeVisible();

    // Students table populated
    await expect(page.getByTestId('students-table')).toBeVisible({ timeout: 15_000 });
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Row click → detail panel
    await rows.first().click();
    await expect(page.getByTestId('student-detail')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'artifacts/e2e-15-students.png', fullPage: true });

    // Search narrows (search for a string no real email contains, expect empty state)
    await page.getByTestId('students-search').fill('zzz-no-such-student-zzz');
    await expect(page.getByText('// no students match')).toBeVisible();
    await page.getByTestId('students-search').fill('');

    await ctx.close();
  });

  test('sidebar sweep: every link renders, sidebar persists on back', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: ADMIN });
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto('/');

    const pages: Array<{ nav: string; assert: () => Promise<void> }> = [
      {
        nav: 'dashboard',
        assert: async () =>
          await expect(page.getByTestId('admin-stats')).toBeVisible({ timeout: 15_000 }),
      },
      {
        nav: 'applications',
        assert: async () =>
          await expect(page.getByTestId('applications-list')).toBeVisible({ timeout: 15_000 }),
      },
      {
        nav: 'content',
        assert: async () =>
          await expect(page.getByRole('heading', { name: 'Content Manager' })).toBeVisible({
            timeout: 15_000,
          }),
      },
      {
        nav: 'ai-masterclass',
        assert: async () =>
          await expect(page).toHaveURL(/ai-masterclass\/step\/1/, { timeout: 15_000 }),
      },
      {
        nav: 'students',
        assert: async () =>
          await expect(page.getByTestId('students-table')).toBeVisible({ timeout: 15_000 }),
      },
      {
        nav: 'analytics',
        assert: async () =>
          await expect(page.getByTestId('analytics-class-picker')).toBeVisible({ timeout: 15_000 }),
      },
    ];

    for (const { nav, assert } of pages) {
      const link = page.getByTestId(`admin-nav-${nav}`);
      await expect(link).toBeVisible(); // dev-server cold compiles can stall hydration
      await link.click();
      await assert();
      await expect(page.getByTestId('admin-nav-dashboard')).toBeVisible(); // sidebar persists
    }

    // browser-back (analytics → students) keeps the console chrome
    await page.goBack();
    await expect(page).toHaveURL(/students/);
    await expect(page.getByTestId('admin-nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('students-table')).toBeVisible({ timeout: 15_000 });

    // back into the redirecting index — sidebar must survive the client redirect
    await page.getByTestId('admin-nav-ai-masterclass').click();
    await expect(page).toHaveURL(/ai-masterclass\/step\/1/, { timeout: 15_000 });
    await page.goBack();
    await expect(page.getByTestId('admin-nav-dashboard')).toBeVisible({ timeout: 15_000 });

    // dashboard still renders after the full sweep
    await page.getByTestId('admin-nav-dashboard').click();
    await expect(page.getByTestId('admin-stats')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'artifacts/e2e-15-sidebar-sweep.png', fullPage: true });

    await ctx.close();
  });

  test('content: class delete button removes a class', async ({ browser }) => {
    const seeded = await seedClassroom('E2E Delete Me Class');
    const ctx = await browser.newContext({ baseURL: ADMIN });
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto('/content');
    const row = page.getByTestId(`class-row-E2E Delete Me Class`);
    await expect(row).toBeVisible({ timeout: 15_000 });

    // cancel path: dialog shows, cancel keeps row
    await page.getByTestId(`class-delete-E2E Delete Me Class`).click();
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('E2E Delete Me Class');
    await page.getByTestId('confirm-dialog-cancel').click();
    await expect(dialog).not.toBeVisible();
    await expect(row).toBeVisible(); // row still there

    // confirm path: dialog shows, confirm deletes
    await page.getByTestId(`class-delete-E2E Delete Me Class`).click();
    await expect(dialog).toBeVisible();
    await page.getByTestId('confirm-dialog-confirm').click();

    // row disappears from the UI…
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    // …and from the DB
    const remaining = await pgClient.query(`SELECT id FROM "Class" WHERE id = $1`, [
      seeded.classId,
    ]);
    expect(remaining.rows.length).toBe(0);

    await ctx.close();
  });

  test('analytics: class picker + heatmap + quiz stats', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: ADMIN });
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto('/analytics');
    await expect(page.getByTestId('analytics-class-picker')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId('analytics-class-picker').locator('button').first(),
    ).toBeVisible();

    await expect(page.getByTestId('analytics-detail')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('lesson completion', { exact: false })).toBeVisible();
    await page.screenshot({ path: 'artifacts/e2e-15-analytics.png', fullPage: true });

    await ctx.close();
  });
});
