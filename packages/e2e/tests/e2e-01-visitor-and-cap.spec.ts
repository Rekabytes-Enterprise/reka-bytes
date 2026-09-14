import { test, expect } from '@playwright/test';
import { uniqueEmail, registerViaApi } from './helpers';

test.describe('E2E-01 · visitor journey', () => {
  test('landing renders → seats counter → navigate to register', async ({ page }) => {
    await page.goto('/academy');

    // headline
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/vibe code/i);

    // seats chip visible with cohort info
    await expect(page.getByTestId('seats-chip')).toContainText(/cohort 001|seats left/i);

    // curriculum section present
    await expect(page.getByText(/01 \/ WHY/i)).toBeVisible();
    await expect(page.getByText(/02 \/ BASICS CLASS/i)).toBeVisible();

    // CTA navigates to register
    await page.getByTestId('join-register-cta').click();
    await expect(page).toHaveURL(new RegExp('/register'));
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });
});

test.describe('E2E-06 · seat cap', () => {
  test('6th registration is blocked at cap (UI + API 409)', async ({ page }) => {
    const { fillApprovedSeats, cleanupUsers } = await import('./helpers');
    const fillers = await fillApprovedSeats(5);

    try {
      // API rejects with COHORT_FULL
      const res = await registerViaApi(uniqueEmail('late'));
      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('COHORT_FULL');

      // UI shows full state — seats endpoint caches briefly in redis,
      // so poll with reloads until the fresh count propagates
      await expect(async () => {
        await page.goto('/register');
        const chip = page.getByTestId('seats-chip');
        await expect(chip).toContainText(/full/i);
      }).toPass({ timeout: 30_000 });
    } finally {
      await cleanupUsers(...fillers);
    }
  });
});

// keep sampleAnswers referenced for direct-API users of this file
