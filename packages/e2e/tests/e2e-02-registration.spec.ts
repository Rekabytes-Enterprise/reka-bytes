import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers';

const REQUIRED_TEXT_Q3 =
  'To me vibe coding means describing what I want to an AI and letting it write the code while I guide it.';

test.describe('E2E-02 · full registration flow', () => {
  test('account + questionnaire → pending screen → login shows PENDING', async ({ page }) => {
    const email = uniqueEmail('student');
    const password = 'password123';

    await page.goto('/register');

    // Step 1 — account
    await page.getByPlaceholder('Aisyah Rahman').fill('Siti Nurhaliza Test');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2 — questionnaire (required: q1 single, q2 multi, q3 text, q4 multi)
    await expect(page.getByRole('heading', { name: /where you're at|where you are at/i })).toBeVisible();

    await page.getByRole('radio', { name: 'Use weekly' }).click();
    await page.getByRole('button', { name: /chatgpt/i }).click();
    await page
      .getByPlaceholder(/describe it in your own words/i)
      .fill(REQUIRED_TEXT_Q3);
    await page.getByRole('button', { name: 'Lovable', exact: true }).click();
    await page.getByRole('button', { name: 'Cursor', exact: true }).click();

    // optional extras for realism
    await page.getByRole('radio', { name: 'Heard of it' }).first().click();

    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3 — review & submit
    await expect(page.getByRole('heading', { name: /review & submit/i })).toBeVisible();
    await page.getByRole('button', { name: /submit application/i }).click();

    // success screen
    await expect(page.getByRole('heading', { name: /application received/i })).toBeVisible();

    // login → status shows PENDING
    await page.getByRole('button', { name: /go to login/i }).click();
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('status-card-PENDING')).toBeVisible();
    await expect(page.getByText(/under review/i)).toBeVisible();
  });
});

test.describe('E2E-03 · registration validation errors', () => {
  test('empty form shows inline errors without submitting', async ({ page }) => {
    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/register')) apiCalled = true;
    });

    await page.goto('/register');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/tell us your name/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    expect(apiCalled).toBe(false);

    // short password case
    await page.getByPlaceholder('Aisyah Rahman').fill('A');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await page.locator('input[type="password"]').fill('short');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/min 2 characters/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
    expect(apiCalled).toBe(false);
  });
});
