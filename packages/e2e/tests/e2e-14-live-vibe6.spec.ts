import { test, expect } from '@playwright/test';
import { BACK, FRONT, uniqueEmail, approveStudent, cleanupUsers, loginCookie } from './helpers';
import { pgClient } from './db';

const PASSWORD = 'password123';
const CLASS_TITLE = 'Vibe Coding Testing 6';

/**
 * LIVE smoke · runs against the developer's own dev servers (localhost:4301).
 * Exercises the REAL generated class "Vibe Coding Testing 6": module map →
 * lesson → inline-check → mark complete → progress tracking → prev/next.
 * Videos + screenshots land in packages/e2e/artifacts/.
 */
test.describe('LIVE · Vibe Coding Testing 6', () => {
  let email = '';
  let lessonIds: string[] = [];

  test.beforeAll(async () => {
    email = uniqueEmail('live-vibe6');
    await approveStudent(email, PASSWORD);
    const res = await pgClient.query<{ id: string }>(
      `SELECT l.id FROM "Lesson" l
       JOIN "Module" m ON l."moduleId" = m.id
       JOIN "Class" c ON m."classId" = c.id
       WHERE c.title = $1
       ORDER BY m."order", l."order"`,
      [CLASS_TITLE],
    );
    lessonIds = res.rows.map((r) => r.id);
    if (lessonIds.length === 0) throw new Error(`no lessons found for class "${CLASS_TITLE}"`);
  });

  test.afterAll(async () => {
    await cleanupUsers(email);
  });

  test('lesson flow: inline-check → mark complete → progress → prev/next', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([{ name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();

    // ── 1. module map shows the class and the first lesson as "current" ──
    await page.goto('/learn');
    const vibe6 = page.locator('section', { hasText: CLASS_TITLE }).filter({ has: page.getByTestId('module-map') });
    await expect(vibe6).toContainText(CLASS_TITLE);
    await expect(page.getByTestId(`lesson-link-${lessonIds[0]}`)).toBeVisible();
    await page.screenshot({ path: 'artifacts/live-01-module-map-before.png', fullPage: true });

    // ── 2. open first lesson, answer EVERY inline-check (auto-complete path) ──
    await page.getByTestId(`lesson-link-${lessonIds[0]}`).click();
    await expect(page.getByTestId('lesson-viewer')).toBeVisible();
    await expect(page.getByTestId('lesson-content')).toBeVisible();
    await page.screenshot({ path: 'artifacts/live-02-lesson-top.png', fullPage: true });

    // Count inline-checks via the student API (sanitized blocks)
    const detail = await fetch(`${BACK}/api/learn/lessons/${lessonIds[0]}`, {
      headers: { Cookie: cookie },
    });
    const detailJson = (await detail.json()) as { data?: { blocks?: Array<{ type: string }> } };
    const checkCount = (detailJson.data?.blocks ?? []).filter((b) => b.type === 'inline-check').length;
    if (checkCount === 0) throw new Error('lesson 1 has no inline-checks — auto-complete path untestable');

    // Answer every check (option A + check answer)
    for (let i = 0; i < checkCount; i++) {
      const check = page.getByTestId('inline-check-block').nth(i);
      await expect(check).toBeVisible();
      await check.locator('button').first().click(); // option A
      await check.getByRole('button', { name: /check answer/i }).click();
      await expect(check.getByText(/✓ correct|✗ not quite/)).toBeVisible({ timeout: 15_000 });
    }
    await page.screenshot({ path: 'artifacts/live-03-inline-check-graded.png', fullPage: true });

    // ── 3. auto-complete: button flips WITHOUT ever clicking it (PRD-03 §2) ──
    await expect(page.getByTestId('mark-complete')).toContainText('completed', { timeout: 10_000 });
    await page.reload();
    await expect(page.getByTestId('mark-complete')).toContainText('completed'); // persisted server-side

    // ── 4. top next-lesson button → lesson 2, MANUAL complete fallback ──
    await page.getByTestId('next-lesson').click();
    await expect(page.getByTestId('lesson-viewer')).toContainText(/Build the Workshop/i);
    await expect(page.getByTestId('mark-complete')).not.toContainText('completed');

    // ── 4b. bottom nav exists and navigates back, then forward again ──
    await expect(page.getByTestId('bottom-nav')).toBeVisible();
    await page.getByTestId('prev-lesson-bottom').click();
    await expect(page.getByTestId('lesson-viewer')).toContainText(/Chef or Critic/i);
    await page.getByTestId('next-lesson-bottom').click();
    await expect(page.getByTestId('lesson-viewer')).toContainText(/Build the Workshop/i);
    await page.screenshot({ path: 'artifacts/live-05-lesson-bottom-nav.png', fullPage: true });

    await page.getByTestId('mark-complete').click();
    await expect(page.getByTestId('mark-complete')).toContainText('completed');

    // ── 5. module map reflects progress: 2/3 done ──
    await page.goto('/learn');
    await expect(vibe6).toContainText('2/3');
    await expect(vibe6.getByTestId('map-dot-done').first()).toBeVisible();
    await page.screenshot({ path: 'artifacts/live-04-module-map-after.png', fullPage: true });

    // ── 6. DB truth: LessonProgress rows + BlockEvents recorded ──
    const progress = await pgClient.query<{ email: string; title: string }>(
      `SELECT u.email, l.title FROM "LessonProgress" p
       JOIN "User" u ON p."userId" = u.id
       JOIN "Lesson" l ON p."lessonId" = l.id
       WHERE u.email = $1 ORDER BY p."completedAt"`,
      [email],
    );
    expect(progress.rows.length).toBe(2);

    const events = await pgClient.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "BlockEvent" be
       JOIN "User" u ON be."userId" = u.id WHERE u.email = $1`,
      [email],
    );
    expect(Number(events.rows[0]?.count ?? '0')).toBeGreaterThanOrEqual(1);

    await ctx.close();
  });
});
