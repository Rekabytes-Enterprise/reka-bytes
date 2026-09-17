import { test, expect } from '@playwright/test';
import { ADMIN, BACK, adminLoginCookie } from './helpers';

/**
 * E2E-19 · Public studio journal, Phase 1 (PRD-07 §3.7). Runs against live
 * dev servers; content = the seed posts in content/journal/ (two published —
 * one featured, with a widget — plus one draft).
 */

const FEATURED_SLUG = 'free-prd-weird-business-model';
const DRAFT_SLUG = 'behind-the-classroom-engine';

test.describe('E2E-19 · journal (phase 1)', () => {
  test('list shows published posts, featured card first', async ({ page }) => {
    await page.goto('/journal');
    await expect(page.getByTestId('journal-featured-card')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(`journal-card-${FEATURED_SLUG}`)).toHaveCount(0); // featured uses its own testid
    await expect(page.getByTestId('journal-card-your-app-idea-is-not-the-hard-part')).toBeVisible();
  });

  test('draft post is hidden from the public list', async ({ page }) => {
    await page.goto('/journal');
    await expect(page.getByTestId(`journal-card-${DRAFT_SLUG}`)).toHaveCount(0);
  });

  test('slug page renders title, date, tags, body', async ({ page }) => {
    await page.goto(`/journal/${FEATURED_SLUG}`);
    await expect(page.getByTestId('journal-title')).toContainText('free consultation');
    await expect(page.getByTestId('journal-published-at')).toBeVisible();
    await expect(page.getByTestId('journal-tag-founders')).toBeVisible();
    await expect(page.getByTestId('journal-read-time')).toContainText(/~\d+ min/);
    await expect(page.getByTestId('journal-back-link')).toBeVisible();
  });

  test('featured slot appears on the company home page', async ({ page }) => {
    await page.goto('/');
    const slot = page.getByTestId('home-featured-journal');
    await expect(slot).toBeVisible({ timeout: 15_000 });
    await expect(slot).toContainText('free consultation');
  });

  test('cover + inline images resolve via the journal asset route', async ({ page }) => {
    await page.goto('/journal');
    const cover = page.getByTestId(`journal-card-cover-${FEATURED_SLUG}`);
    await expect(cover).toBeVisible();
    const src = await cover.getAttribute('src');
    expect(src).toMatch(/^\/api\/public\/journal-assets\//);
    const res = await page.request.get(src ?? '');
    expect(res.status()).toBe(200);
  });

  test('unknown slug and draft slug both render the branded 404', async ({ page }) => {
    await page.goto('/journal/definitely-not-a-real-post');
    await expect(page.getByTestId('error-404')).toBeVisible({ timeout: 15_000 });
    await page.goto(`/journal/${DRAFT_SLUG}`);
    await expect(page.getByTestId('error-404')).toBeVisible();
  });

  test('admin journal view is read-only and shows the draft', async ({ browser }) => {
    const cookie = await adminLoginCookie();
    const ctx = await browser.newContext({ baseURL: ADMIN });
    await ctx.addCookies([
      { name: 'rb_session', value: cookie.split('=')[1] ?? '', domain: 'localhost', path: '/' },
    ]);
    const page = await ctx.newPage();
    await page.goto('/journal');
    await expect(page.getByTestId(`journal-admin-row-${FEATURED_SLUG}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId(`journal-admin-status-${DRAFT_SLUG}`)).toContainText('draft');
    // GitHub edit links, never an in-console editor
    const link = page.getByTestId(`journal-admin-edit-github-${FEATURED_SLUG}`);
    await expect(link).toHaveAttribute('href', new RegExp(`content/journal/.*\\.md$`));
    await expect(page.locator('textarea, [contenteditable]')).toHaveCount(0);
    await ctx.close();
  });

  test('public API envelope: list + featured shape', async () => {
    const list = await fetch(`${BACK}/api/public/posts`);
    expect(list.status).toBe(200);
    const body = (await list.json()) as {
      data: { posts: Array<{ slug: string; readMinutes: number }>; total: number };
    };
    expect(body.data.total).toBeGreaterThanOrEqual(2);
    expect(body.data.posts[0]).toHaveProperty('readMinutes');
  });
});
