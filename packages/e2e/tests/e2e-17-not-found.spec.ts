import { test, expect } from '@playwright/test';

/**
 * e2e-17 — custom 404 ("Block not found") with the isometric voxel scene.
 *
 * Covers every footer route that is planned but not built yet (/project,
 * /news, /showcase) plus a genuinely random path. Asserts the page renders on
 * a REAL HTTP 404 (not a soft-404), that the canvas painted (`data-drawn`),
 * and that the chrome (breadcrumb, home CTA, footer) is present.
 *
 * Run with the override config — the main config spawns dev servers:
 *   pnpm --filter @reka-bytes/e2e exec playwright test \
 *     --config=playwright.notfound.config.ts tests/e2e-17-not-found.spec.ts
 *
 * Artifacts (gitignored): per-route full-page + scene-band screenshots, one
 * video per test, and a reduced-motion still for the static-frame path.
 */

const ROUTES = ['/project', '/news', '/showcase', '/definitely-not-a-block-404'] as const;

test.describe('e2e-17 · 404 block-not-found', () => {
  test('every unmatched route renders the voxel 404 with full chrome', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    for (const route of ROUTES) {
      // Real 404 status — the custom page must not soften into a 200.
      const res = await page.goto(route);
      expect(res?.status(), `HTTP status for ${route}`).toBe(404);

      await expect(page.getByTestId('error-404')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/block not found/i);

      // Scene painted — deterministic wait on the component's own marker
      // (never a sleep; the canvas paints post-hydration).
      const canvas = page.getByTestId('error-404-canvas');
      await expect(canvas).toBeVisible();
      await expect
        .poll(() => canvas.getAttribute('data-drawn'), { timeout: 10_000 })
        .toBe('1');

      await expect(page.getByTestId('error-404-home')).toHaveAttribute('href', '/');
      // NB: <footer> inside <main> loses its implicit `contentinfo` landmark
      // role (HTML-AAM), so locate by element — same DOM on every public page.
      await expect(page.locator('footer')).toBeVisible();

      const slug = route.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'root';

      // Full page — copy, chrome, band proportions.
      await page.screenshot({ path: `artifacts/not-found-${slug}.png`, fullPage: true });

      // Tight scene-band clip — iso alignment, z-order, petal trails.
      const box = await canvas.boundingBox();
      if (box) {
        await page.screenshot({
          path: `artifacts/not-found-scene-${slug}.png`,
          clip: {
            x: Math.max(0, box.x - 24),
            y: Math.max(0, box.y - 24),
            width: box.width + 48,
            height: box.height + 48,
          },
        });
      }
    }

    // The 404 status itself logs expected resource noise; everything else must be silent.
    expect(pageErrors, 'no uncaught exceptions across the sweep').toEqual([]);
    expect(
      consoleErrors.filter((t) => !/status of 404|Failed to load resource/i.test(t)),
      'no unexpected console errors',
    ).toEqual([]);
  });

  test('reduced motion still paints the static frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/project');

    const canvas = page.getByTestId('error-404-canvas');
    await expect(canvas).toBeVisible();
    await expect
      .poll(() => canvas.getAttribute('data-drawn'), { timeout: 10_000 })
      .toBe('1');

    await page.screenshot({ path: 'artifacts/not-found-reduced-motion.png', fullPage: true });
  });

  test('scene actually animates (rAF loop alive)', async ({ page }) => {
    // Guards against the loop silently dying (visibility bug, rAF leak, etc):
    // two captures 400ms apart must differ — shimmer, bob and petals all move.
    await page.goto('/news');
    const canvas = page.getByTestId('error-404-canvas');
    await expect
      .poll(() => canvas.getAttribute('data-drawn'), { timeout: 10_000 })
      .toBe('1');

    const a = await canvas.screenshot();
    await page.waitForTimeout(400);
    const b = await canvas.screenshot();
    expect(a.equals(b), 'canvas frames 400ms apart should differ').toBe(false);
  });

  test('mobile viewport keeps the scene composed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/showcase');
    const canvas = page.getByTestId('error-404-canvas');
    await expect
      .poll(() => canvas.getAttribute('data-drawn'), { timeout: 10_000 })
      .toBe('1');

    // Fit-to-box scaling must not clip the canopy top or platform bottom.
    await page.screenshot({ path: 'artifacts/not-found-mobile.png', fullPage: true });
  });

  test('drag orbits, wheel zooms, click wanders', async ({ page }) => {
    await page.goto('/project');
    const canvas = page.getByTestId('error-404-canvas');
    await expect
      .poll(() => canvas.getAttribute('data-drawn'), { timeout: 10_000 })
      .toBe('1');

    // data-view = "<azimuth-degrees>|<zoom>" — written by the scene each frame
    const readView = async (): Promise<{ az: number; zoom: number }> => {
      const raw = (await canvas.getAttribute('data-view')) ?? '';
      const [az, zoom] = raw.split('|');
      return { az: Number(az), zoom: Number(zoom) };
    };

    // — drag orbits: azimuth must move meaningfully —
    // start left of centre, clear of the caption/hint overlays at the band bottom
    const v0 = await readView();
    await page.mouse.move(480, 220);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(480 + i * 25, 220);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    const v1 = await readView();
    expect(Math.abs(v1.az - v0.az), `orbit: ${v0.az}° → ${v1.az}°`).toBeGreaterThan(15);

    // — wheel zooms: zoom value must increase —
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(180);
    }
    const v2 = await readView();
    expect(v2.zoom, `zoom: ${v1.zoom} → ${v2.zoom}`).toBeGreaterThan(v1.zoom);

    // — click wanders: the ghost block hops to the clicked tile —
    const hops0 = Number((await canvas.getAttribute('data-hops')) ?? '0');
    // near-centre-front of the band — always lands on the island, any azimuth
    await page.mouse.click(640, 240);
    await page.waitForTimeout(250);
    const hops1 = Number((await canvas.getAttribute('data-hops')) ?? '0');
    expect(hops1, 'hop counter incremented').toBe(hops0 + 1);
  });
});
