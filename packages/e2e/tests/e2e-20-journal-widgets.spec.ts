import { test, expect } from '@playwright/test';

/**
 * E2E-20 · Journal widgets, Phase 2 (PRD-07 §4.4). RUN VIA OVERRIDE CONFIG —
 * playwright.journal.config.ts (no webServer; servers must already be up).
 *
 * Fixture: the seeded featured post ships ./widgets/start-ladder.html, so the
 * backend hardening pipeline (gate + CSP + height reporter) runs for real —
 * unlike the lesson scene fixture, this exercises the production path.
 */

const POST = '/journal/free-prd-weird-business-model';
const WIDGET_URL =
  '/api/public/journal-assets/2026-09-15-free-prd-weird-business-model/widgets/start-ladder.html';

test.describe('E2E-20 · journal widgets', () => {
  test('```widget fence renders a sandboxed iframe (journal-widget-0)', async ({ page }) => {
    await page.goto(POST);
    const wrap = page.getByTestId('journal-widget-0');
    await expect(wrap).toBeVisible({ timeout: 15_000 });
    const frame = wrap.locator('iframe');
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    await expect(frame).toHaveAttribute('loading', 'lazy');
  });

  test('widget asset is served hardened, as text/plain', async ({ request }) => {
    const res = await request.get(WIDGET_URL);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
    const html = await res.text();
    expect(html).toContain('data-rb-scene="bridge"'); // height reporter injected
    expect(html).toMatch(/http-equiv="Content-Security-Policy"/i); // CSP injected
  });

  test('scene interaction works inside the sandbox', async ({ page }) => {
    await page.goto(POST);
    const wrap = page.getByTestId('journal-widget-0');
    await expect(wrap).toBeVisible({ timeout: 15_000 });
    const frame = wrap.locator('iframe');
    const inner = frame.contentFrame();
    await inner.getByRole('button', { name: /3 · PRD/i }).click();
    await expect(inner.getByText('FROM RM 150')).toBeVisible();
  });

  test('opaque origin: the scene cannot touch the parent document', async ({ page }) => {
    await page.goto(POST);
    const wrap = page.getByTestId('journal-widget-0');
    await expect(wrap).toBeVisible({ timeout: 15_000 });
    // Evaluate INSIDE the frame's own context: from there, window.top is the
    // parent, and the opaque (sandboxed) origin must make the access throw.
    const child = page.frames().find((f) => f !== page.mainFrame() && f.url() === 'about:srcdoc');
    expect(child).toBeDefined();
    const probe = await child?.evaluate(() => {
      try {
        void (globalThis as unknown as { top: { document: unknown } }).top.document;
        return 'accessible';
      } catch {
        return 'blocked';
      }
    });
    expect(probe).toBe('blocked');
  });

  test('widget page makes no third-party network requests', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const host = new URL(req.url()).hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') external.push(req.url());
    });
    await page.goto(POST);
    await expect(page.getByTestId('journal-widget-0')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    expect(external).toEqual([]);
  });

  test('widget fences degrade to fallback when the file is missing', async ({ request }) => {
    // A fence pointing at a non-existent widget → the asset route 404s, so the
    // renderer must not crash; the fallback block carries the fence's words.
    const res = await request.get(
      '/api/public/journal-assets/2026-09-15-free-prd-weird-business-model/widgets/ghost.html',
    );
    expect(res.status()).toBe(404);
  });
});
