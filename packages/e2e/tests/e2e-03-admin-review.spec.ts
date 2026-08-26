import { test, expect } from '@playwright/test';
import {
  ADMIN,
  FRONT,
  uniqueEmail,
  registerViaApi,
  findApplicationIdByEmail,
} from './helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rekabytes.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me-in-production';
const PASSWORD = 'password123';

test.describe('E2E-04 · admin approves → student sees APPROVED', () => {
  test('review answers, approve, student status updates', async ({ browser }) => {
    // arrange: fresh applicant via API
    const email = uniqueEmail('approve');
    const { status } = await registerViaApi(email);
    expect(status).toBe(201);

    // admin reviews
    const adminCtx = await browser.newContext({ baseURL: ADMIN });
    const adminPage = await adminCtx.newPage();

    await adminPage.goto('/login');
    await adminPage.getByTestId('admin-email').fill(ADMIN_EMAIL);
    await adminPage.getByTestId('admin-password').fill(ADMIN_PASSWORD);
    await adminPage.getByTestId('admin-login-submit').click();
    await expect(adminPage.getByTestId('admin-stats')).toBeVisible();

    const appId = (await findApplicationIdByEmail(email)) as string;
    expect(appId).toBeTruthy();
    await adminPage.goto(`/applications/${appId}`);

    // questionnaire answers visible
    await expect(adminPage.getByTestId('answers-list')).toContainText(/vibe coding means/i);

    // approve
    await adminPage.getByTestId('approve-btn').click();
    await expect(adminPage.getByTestId('confirm-approved-modal')).toBeVisible();
    await adminPage.getByLabel(/internal note/i).fill('Solid baseline — approve for cohort 001.');
    await adminPage.getByTestId('confirm-decision-btn').click();

    // badge flips to APPROVED
    await expect(adminPage.locator('aside').getByText('APPROVED')).toBeVisible();
    await adminCtx.close();

    // student sees APPROVED on the frontend
    const studentCtx = await browser.newContext({ baseURL: FRONT });
    const studentPage = await studentCtx.newPage();
    await studentPage.goto('/login');
    await studentPage.getByTestId('login-email').fill(email);
    await studentPage.getByTestId('login-password').fill(PASSWORD);
    await studentPage.getByTestId('login-submit').click();
    await expect(studentPage.getByTestId('status-card-APPROVED')).toBeVisible();
    await expect(studentPage.getByText(/welcome to cohort 001/i)).toBeVisible();
    await studentCtx.close();
  });
});

test.describe('E2E-05 · admin rejects → student sees REJECTED', () => {
  test('reject flow with internal note', async ({ browser }) => {
    const email = uniqueEmail('reject');
    const { status } = await registerViaApi(email);
    expect(status).toBe(201);

    const adminCtx = await browser.newContext({ baseURL: ADMIN });
    const adminPage = await adminCtx.newPage();

    await adminPage.goto('/login');
    await adminPage.getByTestId('admin-email').fill(ADMIN_EMAIL);
    await adminPage.getByTestId('admin-password').fill(ADMIN_PASSWORD);
    await adminPage.getByTestId('admin-login-submit').click();
    await expect(adminPage.getByTestId('admin-stats')).toBeVisible();

    const appId = (await findApplicationIdByEmail(email)) as string;
    await adminPage.goto(`/applications/${appId}`);
    await adminPage.getByTestId('reject-btn').click();
    await expect(adminPage.getByTestId('confirm-rejected-modal')).toBeVisible();
    await adminPage.getByLabel(/internal note/i).fill('Cohort timing not right — revisit next intake.');
    await adminPage.getByTestId('confirm-decision-btn').click();

    await expect(adminPage.locator('aside').getByText('REJECTED')).toBeVisible();
    await adminCtx.close();

    // student sees REJECTED on the frontend
    const studentCtx = await browser.newContext({ baseURL: FRONT });
    const studentPage = await studentCtx.newPage();
    await studentPage.goto('/login');
    await studentPage.getByTestId('login-email').fill(email);
    await studentPage.getByTestId('login-password').fill(PASSWORD);
    await studentPage.getByTestId('login-submit').click();
    await expect(studentPage.getByTestId('status-card-REJECTED')).toBeVisible();
    await studentCtx.close();
  });
});

test.describe('E2E-07 · auth guards', () => {
  test('unauthenticated /status redirects to login; admin routes blocked', async ({ page }) => {
    await page.goto('/status');
    await expect(page).toHaveURL(/\/login$/);

    // admin console redirects unauthenticated visitors
    const adminPage = await (await page.context().browser()?.newContext())!.newPage();
    if (adminPage) {
      await adminPage.goto(`${ADMIN}/`);
      await expect(adminPage).toHaveURL(/\/login$/);
      await adminPage.context().close();
    }
  });
});
