import { test, expect } from '@playwright/test';
import { ADMIN, uniqueEmail, cleanupUsers, loginCookie, pgClient, approveStudent } from './helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rekabytes.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me-in-production';
const PASSWORD = 'password123';

/**
 * E2E-13 · AI Masterclass with MOCKED AI (AI_MOCK=1 set on the backend
 * webServer in playwright.config.ts — no real API key involved).
 * Upload → poll to outline checkpoint → approve → poll to done →
 * review/edit → publish → student sees the class.
 */
test.describe('E2E-13 · AI masterclass (mocked)', () => {
  let email = '';
  const classTitle = `E2E AI Class ${Date.now()}`;

  test.afterAll(async () => {
    await pgClient.query(`DELETE FROM "Class" WHERE title = $1`, [classTitle]).catch(() => undefined);
    if (email) await cleanupUsers(email);
  });

  test('upload → outline checkpoint → generate (mock) → review edit → publish', async ({ browser }) => {
    // admin session via API cookie
    const adminCtx = await browser.newContext({ baseURL: ADMIN });
    const page = await adminCtx.newPage();
    const cookie = await loginCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    await adminCtx.addCookies([{ name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);

    // step 1 — upload fixture PDF + title
    await page.goto('/ai-masterclass/step/1');
    await page.getByTestId('ai-file-input').locator('input[type=file]').setInputFiles('tests/fixtures/curriculum.pdf');
    await page.getByTestId('ai-class-title').fill(classTitle);
    await page.getByTestId('ai-generate-btn').click();

    // step 2 — mock job pauses at the outline checkpoint; auto-advance to step 3
    await page.waitForURL('**/ai-masterclass/step/3', { timeout: 20_000 });

    // step 3 — outline checkpoint: modules visible, then approve → phase 2
    await expect(page.getByTestId('ai-outline-summary')).toContainText('modules');
    await expect(page.getByTestId('ai-outline-module').first()).toBeVisible();
    await page.getByTestId('ai-approve-btn').click();

    // back through step 2 (resume polling) → auto-advance to step 4 when done
    await page.waitForURL('**/ai-masterclass/step/4', { timeout: 30_000 });

    // step 4 — generated tree visible; rename a lesson via InlineText (pencil → input → Enter)
    await expect(page.getByTestId('ai-review-summary')).toContainText('modules');
    await page.getByRole('button', { name: 'edit' }).first().click();
    const inlineInput = page.getByTestId('inline-edit-input').first();
    await expect(inlineInput).toBeVisible();
    await inlineInput.fill('Edited Lesson Title');
    await inlineInput.press('Enter');
    // input closes on successful save and the row shows the new title
    await expect(page.getByTestId('inline-edit-input')).toHaveCount(0);
    await expect(page.getByText('Edited Lesson Title').first()).toBeVisible();

    await page.getByTestId('ai-review-continue').click();

    // step 5 — publish
    await page.waitForURL('**/ai-masterclass/step/5');
    await expect(page.locator('dl')).toContainText(classTitle);
    await page.getByTestId('publish-radio-true').check();
    await page.getByTestId('ai-publish-btn').click();
    await expect(page.getByTestId('ai-publish-success')).toBeVisible({ timeout: 25_000 });

    await adminCtx.close();

    // ── student sees the published AI-generated class ──
    email = uniqueEmail('aistudent');
    await approveStudent(email, PASSWORD);

    const studentCtx = await browser.newContext({ baseURL: 'http://localhost:4301' });
    const spage = await studentCtx.newPage();
    const sCookie = await loginCookie(email, PASSWORD);
    await studentCtx.addCookies([{ name: 'rb_session', value: sCookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);
    await spage.goto('/learn');
    await expect(spage.getByTestId('learn-tree')).toContainText(classTitle);
    await expect(spage.getByTestId('learn-tree')).toContainText('Module 2: First Project');
    await expect(spage.getByTestId('learn-tree')).toContainText('Edited Lesson Title');

    await studentCtx.close();
  });
});
