import { test, expect } from '@playwright/test';
import {
  FRONT,
  uniqueEmail,
  approveStudent,
  cleanupUsers,
  seedClassroom,
  cleanupClassroom,
  loginCookie,
} from './helpers';
import { pgClient } from './db';

const PASSWORD = 'password123';

/**
 * E2E-09 · Lesson flow: markdown renders (raw HTML inert — XSS check),
 * YouTube embed present, mark-complete persists across reload, prev/next works.
 */
test.describe('E2E-09 · lesson viewer flow', () => {
  let classroom: Awaited<ReturnType<typeof seedClassroom>>;
  let email = '';

  test.beforeEach(async () => {
    classroom = await seedClassroom('E2E Lesson Flow Class');
    email = uniqueEmail('learner');
    await approveStudent(email, PASSWORD);
  });

  test.afterEach(async () => {
    await cleanupUsers(email);
    await cleanupClassroom(classroom.classId);
  });

  test('lesson renders, marks complete, persists, navigates', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    // seed session cookie directly (login already covered elsewhere)
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    // module tree
    await page.goto('/learn');
    await expect(page.getByTestId('learn-tree')).toContainText('E2E Lesson Flow Class');
    await page.getByTestId(`lesson-link-${classroom.lessonIds[0]}`).click();

    // lesson viewer
    await expect(page.getByTestId('lesson-viewer')).toContainText('Lesson One');
    await expect(page.getByTestId('lesson-video')).toBeVisible(); // youtube embed
    await expect(page.getByTestId('lesson-content')).toContainText('npm install');

    // XSS: raw <script> from markdown must NOT execute/create nodes
    expect(await page.locator('script#xss, script').filter({ hasText: 'alert' }).count()).toBe(0);

    // mark complete + persists
    await page.getByTestId('mark-complete').click();
    await expect(page.getByTestId('mark-complete')).toContainText('completed');
    await page.reload();
    await expect(page.getByTestId('mark-complete')).toContainText('completed');

    // prev/next
    await page.getByTestId('next-lesson').click();
    await expect(page.getByTestId('lesson-viewer')).toContainText('Lesson Two');
    await expect(page.getByTestId('prev-lesson')).toBeVisible();
    await expect(page.getByTestId('mark-complete')).not.toContainText('completed');

    await ctx.close();
  });

  test('typed blocks render: inline-check grades server-side, mermaid degrades safely', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    // Give the seeded lesson a typed block body (valid mermaid + BROKEN mermaid
    // + inline-check) while keeping contentMarkdown as fallback.
    const blocks = [
      { type: 'prose', markdown: '## Blocks lesson\n\nIntro paragraph.' },
      { type: 'mermaid', source: 'graph TD\n  A[Start] --> B[End]', caption: 'the flow' },
      {
        type: 'inline-check',
        question: 'What does npm install do?',
        options: ['Installs packages', 'Dances'],
        correctIndex: 0,
        explanation: 'It installs project packages.',
      },
      { type: 'mermaid', source: 'this is ((( not valid mermaid', caption: 'broken' },
      { type: 'recap', points: ['point one'] },
    ];
    await pgClient.query(`UPDATE "Lesson" SET blocks = $1 WHERE id = $2`, [
      JSON.stringify(blocks),
      classroom.lessonIds[0],
    ]);

    // SECURITY: correctIndex/explanation must never appear in the student DTO
    const lessonResponsePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/learn/lessons/${classroom.lessonIds[0]}`) && r.status() === 200,
    );
    await page.goto(`/learn/${classroom.lessonIds[0]}`);
    const lessonBody = (await (await lessonResponsePromise).body()).toString();
    expect(lessonBody).not.toContain('correctIndex');
    expect(lessonBody).not.toContain('explanation');

    // BlockRenderer took over from markdown fallback
    await expect(page.getByTestId('block-prose')).toContainText('Blocks lesson');

    // Mermaid: valid source renders an SVG…
    await expect(page.getByTestId('mermaid-block').first()).toBeVisible();
    await expect(page.getByTestId('block-mermaid').first()).toContainText('svg', {
      ignoreCase: false,
    });
    const svgCount = await page.getByTestId('block-mermaid').first().locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
    // …broken source falls back to a visible code block, never blank
    await expect(page.getByTestId('block-mermaid').nth(1)).toContainText(
      'diagram failed to render',
    );
    await expect(page.getByTestId('block-mermaid').nth(1)).toContainText('not valid mermaid');

    // Inline check: graded server-side, feedback revealed after submit
    await page.getByTestId('inline-check-block').getByRole('button').first().click();
    await page.getByRole('button', { name: 'check answer' }).click();
    await expect(page.getByTestId('inline-check-block')).toContainText('✓ correct');
    await expect(page.getByTestId('inline-check-block')).toContainText(
      'It installs project packages.',
    );

    // Recap block rendered
    await expect(page.getByTestId('recap-block')).toBeVisible();

    await ctx.close();
  });

  test('/learn shows the graphical module map', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto('/learn');
    await expect(page.getByTestId('module-map').first()).toBeVisible();
    // current lesson dot exists (nothing completed yet)
    await expect(page.getByTestId('map-dot-current').first()).toBeVisible();

    await ctx.close();
  });
});
