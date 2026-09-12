import { test, expect } from '@playwright/test';
import {
  FRONT,
  ADMIN,
  uniqueEmail,
  approveStudent,
  cleanupUsers,
  seedClassroom,
  cleanupClassroom,
  loginCookie,
  adminLoginCookie,
  pgClient,
} from './helpers';

const PASSWORD = 'password123';

/**
 * A minimal self-contained scene for the spec — the spec owns its fixture, so
 * it ships its own height reporter (the server pipeline injects one for real
 * AI scenes; e2e fixtures bypass that by writing blocks directly).
 */
const SCENE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui, sans-serif; margin: 0; padding: 14px; }
#grow { padding: 10px 14px; font-size: 14px; }
.box { height: 60px; background: #4E7700; margin-top: 10px; transition: height .2s; }
</style></head><body>
<button id="grow">Make it taller</button>
<div class="box" id="box"></div>
<script>
var box = document.getElementById('box');
document.getElementById('grow').addEventListener('click', function () {
  box.style.height = (box.offsetHeight + 80) + 'px';
  parent.postMessage({ source: 'rb-scene', type: 'height', height: document.documentElement.scrollHeight }, '*');
});
parent.postMessage({ source: 'rb-scene', type: 'height', height: document.documentElement.scrollHeight }, '*');
</script></body></html>`;

const WIDGET_BLOCK = (reviewed: boolean) => [
  {
    type: 'widget',
    title: 'E2E scene',
    html: SCENE_HTML,
    brief: 'Click the button and the scene grows.',
    fallbackMarkdown:
      '**Static fallback.** The interactive version lets you grow a box. This static text is what no-JS / unreviewed users see.',
    reviewed,
  },
];

async function seedSceneLesson(reviewed: boolean): Promise<string> {
  const classroom = await seedClassroom('E2E Scene Class');
  const lessonId = classroom.lessonIds[0];
  if (!lessonId) throw new Error('seed produced no lesson');
  await pgClient.query(`UPDATE "Lesson" SET blocks = $1::jsonb WHERE id = $2`, [
    JSON.stringify(WIDGET_BLOCK(reviewed)),
    lessonId,
  ]);
  return lessonId;
}

/**
 * E2E-18 · Scenes (PRD-06): sandboxed widget blocks render, never leak origin,
 * height-sync works, and the review gate hides unreviewed scenes from students.
 * Run via the override config (no dev-server spawning):
 *   npx playwright test --config=playwright.scenes.config.ts tests/e2e-18-scenes.spec.ts
 */
test.describe('E2E-18 · sandboxed scenes', () => {
  let email = '';
  let lessonId = '';

  test.afterEach(async () => {
    await cleanupUsers(email);
    if (lessonId) await pgClient.query(`DELETE FROM "Lesson" WHERE id = $1`, [lessonId]);
  });

  test('unreviewed scene is hidden behind the review gate (no iframe at all)', async ({
    browser,
  }) => {
    lessonId = await seedSceneLesson(false);
    email = uniqueEmail('scenepending');
    await approveStudent(email, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto(`/learn/${lessonId}`);
    await expect(page.getByTestId('lesson-viewer')).toBeVisible();
    await expect(page.getByTestId('scene-review-pending')).toBeVisible();
    await expect(page.getByTestId('scene-fallback')).toContainText('static fallback', {
      ignoreCase: true,
    });
    await expect(page.locator('iframe[data-testid^="scene-frame"]')).toHaveCount(0);
    await ctx.close();
  });

  test('reviewed scene renders sandboxed iframe, height-syncs, and is same-origin-blind', async ({
    browser,
  }) => {
    lessonId = await seedSceneLesson(true);
    email = uniqueEmail('scenereviewed');
    await approveStudent(email, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto(`/learn/${lessonId}`);
    const frame = page.getByTestId('scene-frame-0').locator('iframe');
    await expect(frame).toBeVisible();

    // The whole security model rides on this attribute set.
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    await expect(page.getByTestId('scene-title')).toContainText('E2E scene');

    // Height sync: clicking grows the scene → parent resizes the iframe style.
    const before = await frame.getAttribute('style');
    await frame.getByRole('button', { name: 'Make it taller' }).click();
    await expect.poll(async () => frame.getAttribute('style'), { timeout: 5000 }).not.toBe(before);

    // The opaque-origin scene cannot see the parent page (no same-origin):
    // reading top.document must throw inside the sandboxed frame.
    const sceneTitle = await frame.evaluate(
      `(() => { try { return String(top.document.title) } catch (e) { return 'BLOCKED' } })()`,
    );
    expect(sceneTitle).toBe('BLOCKED');
    await ctx.close();
  });

  test('scene without a height reporter degrades to fallback after timeout', async ({
    browser,
  }) => {
    // No reporter script → no height message → SceneFrameView times out.
    const silentScene = SCENE_HTML.replace(
      /<script>[\s\S]*<\/script>/,
      '<script>/* no reporter */</script>',
    );
    lessonId = await seedClassroom('E2E Scene Silent Class').then(async (classroom) => {
      const id = classroom.lessonIds[0];
      if (!id) throw new Error('seed produced no lesson');
      await pgClient.query(`UPDATE "Lesson" SET blocks = $1::jsonb WHERE id = $2`, [
        JSON.stringify([{ ...WIDGET_BLOCK(true)[0], html: silentScene }]),
        id,
      ]);
      return id;
    });
    email = uniqueEmail('scenesilent');
    await approveStudent(email, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    await page.goto(`/learn/${lessonId}`);
    // 8s timeout in SceneFrameView + margin
    await expect(page.getByTestId('scene-fallback')).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test('admin acknowledge flow: scene row → mark reviewed → student sees the frame', async ({
    browser,
  }) => {
    lessonId = await seedSceneLesson(false);
    email = uniqueEmail('sceneadmin');
    await approveStudent(email, PASSWORD);

    // Admin: open the editor for this lesson, acknowledge the scene.
    const adminCtx = await browser.newContext({ baseURL: 'http://localhost:4302' });
    const adminCookie = await adminLoginCookie();
    await adminCtx.addCookies([
      {
        name: 'rb_session',
        value: adminCookie.split('=')[1] ?? '',
        domain: 'localhost',
        path: '/',
      },
    ]);
    const adminPage = await adminCtx.newPage();

    // class detail → lesson edit (the seeded lesson lives under the first class/module)
    await adminPage.goto('/');
    await adminPage.getByRole('button', { name: 'Edit lesson' }).first().click();

    const row = adminPage.getByTestId('lesson-scene-row-0');
    await expect(row).toBeVisible();
    await expect(row.getByText('awaiting review')).toBeVisible();

    // Preview opens a sandboxed admin preview.
    await row.getByTestId('scene-preview-toggle-0').click();
    await expect(row.getByTestId('scene-preview')).toBeVisible();

    await row.getByTestId('scene-acknowledge-0').click();
    await expect(row.getByText('reviewed ✓')).toBeVisible();
    await adminCtx.close();

    // Student now sees the live frame.
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();
    await page.goto(`/learn/${lessonId}`);
    await expect(page.getByTestId('scene-frame-0').locator('iframe')).toBeVisible();
    await ctx.close();
  });
});
