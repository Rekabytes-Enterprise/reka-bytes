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

const PASSWORD = 'password123';

/**
 * E2E-10 · Quiz flow: correctIndex never in the public payload, submit scores
 * correctly, pass/fail banners render, retry creates a new attempt.
 */
test.describe('E2E-10 · quiz flow', () => {
  let classroom: Awaited<ReturnType<typeof seedClassroom>>;
  let email = '';

  test.beforeEach(async () => {
    classroom = await seedClassroom('E2E Quiz Class');
    email = uniqueEmail('quizzer');
    await approveStudent(email, PASSWORD);
  });

  test.afterEach(async () => {
    await cleanupUsers(email);
    await cleanupClassroom(classroom.classId);
  });

  test('take quiz → pass → retry fails with wrong answers', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(email, PASSWORD);
    await ctx.addCookies([{ name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' }]);
    const page = await ctx.newPage();

    // ── cheat check: correctIndex absent from GET response ──
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/learn/quizzes/${classroom.quizId}`) && r.request().method() === 'GET'),
      page.goto(`/learn/quiz/${classroom.quizId}`),
    ]);
    const bodyText = await res.text();
    expect(bodyText.includes('correctIndex')).toBe(false);

    // answer correctly (both questions) — one question per screen
    for (let i = 0; i < classroom.correctAnswers.length; i++) {
      await page.getByTestId(`quiz-option-${i}-${classroom.correctAnswers[i]}`).click();
      if (i < classroom.correctAnswers.length - 1) {
        await page.getByTestId('quiz-next').click();
      }
    }
    await page.getByTestId('quiz-submit').click();
    await expect(page.getByTestId('quiz-pass-banner')).toContainText('100%');
    expect(await page.getByTestId('quiz-fail-banner').count()).toBe(0);

    // breakdown visible
    await expect(page.getByTestId('quiz-results-breakdown')).toBeVisible();

    // retry — answer everything wrong (flip each answer)
    await page.getByTestId('quiz-retry').click();
    for (let i = 0; i < classroom.correctAnswers.length; i++) {
      await page.getByTestId(`quiz-option-${i}-${classroom.correctAnswers[i] === 0 ? 1 : 0}`).click();
      if (i < classroom.correctAnswers.length - 1) {
        await page.getByTestId('quiz-next').click();
      }
    }
    await page.getByTestId('quiz-submit').click();
    await expect(page.getByTestId('quiz-fail-banner')).toBeVisible();
    await expect(page.getByTestId('quiz-fail-banner')).toContainText('%');

    await ctx.close();
  });
});
