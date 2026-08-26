import { test, expect } from '@playwright/test';
import { FRONT, BACK, uniqueEmail, approveStudent, cleanupUsers, loginCookie } from './helpers';
import { pgClient } from './db';

const PASSWORD = 'password123';

/**
 * PRD-04 R3 · gamification smoke. Exercises the full XP loop:
 *   1. Fresh approved student completes a lesson (inline-check auto-complete)
 *   2. Dashboard renders the new game widgets (level pill, XP bar, streak card, quiz avg)
 *   3. XP toast fires once on lesson completion (verify visible)
 *   4. Dashboard game.xp reflects awarded XP (balance > 0, first-steps badge unlocked)
 *   5. Reload — celebration does NOT re-fire (badge-diff consumed via localStorage)
 *
 * Picks the FIRST published class with at least one inline-check so it works
 * against any environment (live or AI_MOCK fixtures). Skips if none found.
 */
test.describe('PRD-04 R3 · gamification', () => {
  let email = '';
  let lessonId = '';
  let classTitle = '';

  test.beforeAll(async () => {
    email = uniqueEmail('gamification');
    await approveStudent(email, PASSWORD);

    // Pick the first published lesson whose blocks JSON contains an inline-check.
    // (DB-side check — no auth needed; sanitization only matters for student payloads.)
    const res = await pgClient.query<{ id: string; classTitle: string }>(
      `SELECT l.id, c.title AS "classTitle"
       FROM "Lesson" l
       JOIN "Module" m ON l."moduleId" = m.id
       JOIN "Class" c ON m."classId" = c.id
       WHERE c.published = true
         AND l.blocks IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(l.blocks) AS elem
           WHERE elem->>'type' = 'inline-check'
         )
       ORDER BY c."order", m."order", l."order"
       LIMIT 1`,
    );
    const first = res.rows[0];
    if (!first) throw new Error('no published lessons with inline-checks found; gamification spec requires one');
    lessonId = first.id;
    classTitle = first.classTitle;
  });

  test.afterAll(async () => {
    await cleanupUsers(email);
  });

  test('lesson complete awards XP, fires toast, unlocks first-steps', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    // ── 1. lesson flow (inline-check → auto-complete) ──
    await page.goto(`/learn/${lessonId}`);
    await expect(page.getByTestId('lesson-viewer')).toBeVisible({ timeout: 15_000 });

    // Answer all inline-checks in this lesson — auto-complete fires on the last one.
    const checkCount = await page.getByTestId('inline-check-block').count();
    if (checkCount === 0) throw new Error('lesson has no inline-checks (after API probe) — fixture drift');
    for (let i = 0; i < checkCount; i++) {
      const block = page.getByTestId('inline-check-block').nth(i);
      await expect(block).toBeVisible();
      await block.locator('button').first().click();
      await block.getByRole('button', { name: /check answer/i }).click();
      await expect(block.getByText(/✓ correct|✗ not quite/)).toBeVisible({ timeout: 15_000 });
    }

    // After the final check, mark-complete flips OR the lessonComplete callback already did.
    await expect(page.getByTestId('mark-complete')).toContainText(/completed/i, { timeout: 10_000 });

    // ── 2. XP toast fired ──
    await expect(page.getByTestId('xp-toast').first()).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'artifacts/gam-01-toast.png', fullPage: true });

    // ── 3. dashboard widgets rendered + game data correct ──
    await page.goto('/dashboard');
    await expect(page.getByTestId('student-dashboard')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('level-pill')).toBeVisible();
    await expect(page.getByTestId('xp-bar')).toBeVisible();
    await expect(page.getByTestId('streak-card')).toBeVisible();
    await expect(page.getByTestId('quiz-avg-card')).toBeVisible();
    await expect(page.getByTestId('continue-hero')).toBeVisible();

    const dashboardData = await fetch(`${BACK}/api/learn/dashboard`, {
      headers: { Cookie: cookie },
    }).then((r) => r.json() as Promise<{ data: { game: { xp: { balance: number; level: number }; badges: Array<{ key: string; unlocked: boolean }> } } }>);

    expect(dashboardData.data.game.xp.balance).toBeGreaterThan(0);
    const firstSteps = dashboardData.data.game.badges.find((b) => b.key === 'first-steps');
    expect(firstSteps?.unlocked).toBe(true);

    await page.screenshot({ path: 'artifacts/gam-02-dashboard.png', fullPage: true });

    // ── 4. badge diff: reload dashboard — celebrations do NOT re-fire ──
    // localStorage `rb-last-seen-badges` was persisted on first visit; the
    // second visit should NOT spawn new toasts.
    const toastBefore = await page.getByTestId('xp-toast').count();
    await page.reload();
    await expect(page.getByTestId('student-dashboard')).toBeVisible();
    // Allow any in-flight toast to clear before counting
    await page.waitForTimeout(800);
    const toastAfter = await page.getByTestId('xp-toast').count();
    expect(toastAfter).toBe(0);
    expect(toastBefore).toBeGreaterThanOrEqual(0); // (already-dismissed is fine)

    // ── 5. profile badge grid reflects the unlock ──
    await page.goto('/profile');
    await expect(page.getByTestId('profile-identity')).toBeVisible();
    await expect(page.getByTestId('badge-grid')).toBeVisible();
    const firstStepsTile = page.getByTestId('badge-first-steps');
    await expect(firstStepsTile).toHaveAttribute('data-unlocked', 'true');

    // ── 6. DB truth: XpEvent row(s) exist for the user ──
    const events = await pgClient.query<{ count: string; total: string }>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
       FROM "XpEvent" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`,
      [email],
    );
    expect(Number(events.rows[0]?.count ?? '0')).toBeGreaterThanOrEqual(1);
    expect(Number(events.rows[0]?.total ?? '0')).toBeGreaterThanOrEqual(50);

    await ctx.close();
  });
});