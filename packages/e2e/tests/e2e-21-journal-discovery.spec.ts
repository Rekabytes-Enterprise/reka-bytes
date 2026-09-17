import { test, expect } from '@playwright/test';
import { BACK } from './helpers';

/**
 * E2E-21 · Journal discovery & polish, Phase 3 (PRD-07 §5.5).
 *
 * Pagination math + tag filtering are asserted at the API (seed content only
 * ships a handful of posts, so `?limit=2` manufactures the multi-page case
 * without touching the repo); the UI tests cover tag navigation, empty
 * states, and the cover-image contract.
 */

const FEATURED_SLUG = 'free-prd-weird-business-model';

test.describe('E2E-21 · journal discovery', () => {
  test('API pagination: limit/page/totalPages math', async () => {
    const res = await fetch(`${BACK}/api/public/posts?limit=2&page=2`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { posts: unknown[]; page: number; limit: number; total: number; totalPages: number };
    };
    expect(body.data.page).toBe(2);
    expect(body.data.limit).toBe(2);
    expect(body.data.totalPages).toBeGreaterThanOrEqual(1);
    // Page beyond the end clamps instead of erroring.
    const beyond = await (await fetch(`${BACK}/api/public/posts?page=999`)).json();
    const beyondBody = beyond as { data: { page: number } };
    expect(beyondBody.data.page).toBeLessThan(999);
  });

  test('API tag filter returns only matching posts', async () => {
    const res = await fetch(`${BACK}/api/public/posts?tag=studio`);
    const body = (await res.json()) as {
      data: { posts: Array<{ tags: string[]; slug: string }>; total: number };
    };
    expect(body.data.total).toBeGreaterThan(0);
    for (const post of body.data.posts) expect(post.tags).toContain('studio');
    const missing = await (await fetch(`${BACK}/api/public/posts?tag=zzz-no-tags`)).json();
    const missingBody = missing as { data: { total: number; posts: unknown[] } };
    expect(missingBody.data.total).toBe(0);
    expect(missingBody.data.posts).toEqual([]);
  });

  test('tag page UI lists matching posts; unknown tag shows empty state', async ({ page }) => {
    await page.goto('/journal/tag/studio');
    await expect(page.getByTestId('journal-featured-card')).toBeVisible({ timeout: 15_000 });
    await page.goto('/journal/tag/zzz-no-tags');
    await expect(page.getByText(/no posts tagged/)).toBeVisible();
  });

  test('tag links on cards navigate to tag pages', async ({ page }) => {
    await page.goto(`/journal/${FEATURED_SLUG}`);
    await page.getByTestId('journal-tag-founders').click();
    await expect(page).toHaveURL(/\/journal\/tag\/founders$/);
    await expect(page.getByTestId('journal-featured-card')).toBeVisible();
  });

  test('cards show read-time and cover-image contract', async ({ page }) => {
    await page.goto('/journal');
    const featured = page.getByTestId('journal-featured-card');
    await expect(featured.getByTestId('journal-read-time')).toContainText(/~\d+ min/);
    const cover = featured.locator('img');
    await expect(cover).toHaveCount(1);
    await expect(cover).toHaveAttribute('src', /\/api\/public\/journal-assets\/.+cover\.svg$/);
  });
});
