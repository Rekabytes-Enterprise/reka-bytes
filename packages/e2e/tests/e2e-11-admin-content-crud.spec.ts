import { test, expect } from '@playwright/test';
import {
  ADMIN,
  uniqueEmail,
  cleanupUsers,
  loginCookie,
  pgClient,
  approveStudent,
} from './helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rekabytes.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me-in-production';

/**
 * E2E-11 · Admin content CRUD via the UI: create class → module → lesson →
 * quiz + question → publish → student sees it on /learn.
 */
test.describe('E2E-11 · admin content CRUD', () => {
  const email = `crud-student-${Date.now()}-${Math.floor(Math.random() * 10_000)}@e2e.rekabytes.test`;
  let classTitle = '';

  test.afterAll(async () => {
    // remove class (cascades) + student
    await pgClient.query(`DELETE FROM "Class" WHERE title LIKE 'E2E CRUD Class%'`).catch(() => undefined);
    await cleanupUsers(email);
  });

  test('full authoring loop ends with a published class', async ({ browser }) => {
    classTitle = `E2E CRUD Class ${Date.now()}`;

    const adminCtx = await browser.newContext({ baseURL: ADMIN });
    const page = await adminCtx.newPage();
    const cookie = await loginCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    await adminCtx.addCookies([{ name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);

    // create class
    await page.goto('/content/class/new');
    await page.getByTestId('class-title-input').fill(classTitle);
    await page.getByTestId('class-create-btn').click();

    // add module
    await expect(page.getByTestId('new-module-input')).toBeVisible();
    await page.getByTestId('new-module-input').fill('CRUD Module');
    await page.getByRole('button', { name: '+ add module' }).click();
    await expect(page.getByTestId('module-list')).toContainText('CRUD Module');

    // add lesson (modal)
    await page.getByRole('button', { name: 'add lesson' }).first().click();
    await expect(page.getByTestId('lesson-editor-modal')).toBeVisible();
    await page.getByTestId('lesson-title-input').fill('CRUD Lesson');
    await page.getByTestId('lesson-markdown-input').fill('# CRUD Lesson\n\nAuthored by **E2E**.');
    await page.getByTestId('lesson-save-btn').click();
    await expect(page.getByTestId('module-list')).toContainText('CRUD Lesson');

    // create quiz for the module
    const moduleId = (await page.getByTestId('module-list').locator('[data-testid^="module-"]').first().getAttribute('data-testid'))?.replace('module-', '');
    await page.goto(`/content/quizzes/new?moduleId=${moduleId}`);
    await page.getByTestId('quiz-create-btn').click();

    // add a question
    await page.getByTestId('add-question-btn').click();
    await page.locator('textarea').fill('What does CRUD stand for?');
    await page.locator('input[placeholder="Option A"]').fill('Create Read Update Delete');
    await page.locator('input[placeholder="Option B"]').fill('Cache Run Upload Download');
    await page.locator('input[placeholder="Option C"]').fill('Compile Render Upload Deploy');
    await page.locator('input[placeholder="Option D"]').fill('Copy Rewrite Undo Delete');
    await page.getByTestId('correct-radio-0').check();
    await page.getByTestId('question-save-btn').click();
    await expect(page.getByTestId('question-list')).toContainText('Create Read Update Delete');

    // publish from class detail
    await page.goto('/content');
    await expect(page.getByTestId(`class-row-${classTitle}`)).toContainText('draft');
    await page.getByTestId(`class-row-${classTitle}`).click();
    await page.getByTestId('class-publish-toggle').click();
    await expect(page.getByTestId('class-publish-toggle')).toContainText('published');

    await adminCtx.close();

    // ── student sees the published class ──
    const password = 'password123';
    await approveStudent(email, password);

    const studentCtx = await browser.newContext({ baseURL: 'http://localhost:4301' });
    const spage = await studentCtx.newPage();
    const sCookie = await loginCookie(email, password);
    await studentCtx.addCookies([{ name: 'rb_session', value: sCookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);
    await spage.goto('/learn');
    await expect(spage.getByTestId('learn-tree')).toContainText(classTitle);

    await studentCtx.close();
  });
});
