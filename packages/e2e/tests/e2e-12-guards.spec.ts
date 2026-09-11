import { test, expect } from '@playwright/test';
import {
  BACK,
  FRONT,
  uniqueEmail,
  registerViaApi,
  cleanupUsers,
  loginCookie,
  approveStudent,
} from './helpers';

const PASSWORD = 'password123';

/**
 * E2E-12 · Guards: PENDING student blocked from /dashboard & /learn (redirect
 * to /status); approved student's cookies get 403 on /api/admin/*; anonymous
 * gets 401 on /api/learn/*.
 */
test.describe('E2E-12 · auth guards', () => {
  test('PENDING user redirected; role boundaries hold', async ({ browser }) => {
    const pendingEmail = uniqueEmail('pending');
    await registerViaApi(pendingEmail, PASSWORD);

    const ctx = await browser.newContext({ baseURL: FRONT });
    const cookie = await loginCookie(pendingEmail, PASSWORD);
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();

    // UI guard: PENDING → bounced to /status with toast
    await page.goto('/dashboard');
    await page.waitForURL('**/status');
    expect(new URL(page.url()).pathname).toBe('/status');

    await page.goto('/learn');
    await page.waitForURL('**/status');
    expect(new URL(page.url()).pathname).toBe('/status');

    // API boundary: even APPROVED students cannot touch admin endpoints
    const approvedEmail = uniqueEmail('approved');
    await approveStudent(approvedEmail, PASSWORD);
    const approvedCookie = await loginCookie(approvedEmail, PASSWORD);
    const res = await fetch(`${BACK}/api/admin/stats`, { headers: { Cookie: approvedCookie } });
    expect(res.status).toBe(403);

    // anonymous cannot touch learn endpoints
    const anonRes = await fetch(`${BACK}/api/learn/classes`);
    expect(anonRes.status).toBe(401);

    await cleanupUsers(pendingEmail, approvedEmail);
  });
});
