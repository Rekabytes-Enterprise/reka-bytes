# Memory — Reka Bytes (distilled facts & gotchas)

## Frontend 404 (`app/not-found.tsx` + `components/landing/not-found-scene.tsx`)
- Custom "Block not found" 404, **now an interactive voxel viewer** modelled on petalwind (three.js reference site): drag to orbit, wheel to zoom, click a tile and the ghost block hops there in a petal burst; cursor velocity becomes wind on the petals. Scene = 11×11 grass chunk, 2×2 fountain pool sunk below a 12-block stone rim, stone arch across the back edge, two benches, two sakura trees, flower specks, a floating islet, 28 falling petals. **Canvas 2D, zero dependencies** — no three.js; house pattern is canvas components in `components/landing/`.
- **`metadata` export WORKS in `not-found.tsx` on Next 16** — `<title>Block not found — Reka Bytes</title>` confirmed in prerendered HTML (old Next lore says it's ignored; it isn't here).
- Renders inside root layout, OUTSIDE the `(student)` group — no sidebar. `notFound()` from nested routes (bad `/learn/[lessonId]`) lands here too.
- Testids: `error-404`, `error-404-canvas`, `error-404-home`. Canvas telemetry read by e2e: `data-drawn="1"` after first paint (both animated + reduced-motion paths), `data-view="<azDeg>|<zoom>"` and `data-hops="<n>"` updated per frame — this is how orbit/zoom/wander get asserted deterministically instead of pixel-diffing.

## Isometric voxel renderer gotchas (all cost a debugging cycle)
- **Face culling is mandatory once the camera rotates.** Drawing all 3 faces per block looks fine at the default azimuth but turns a flat platform into a brown "waffle" mid-orbit (interior side faces poke over neighbours' tops). Fix: `OCCUPIED` set + draw a side face only when the neighbouring cell is empty AND the face is camera-facing (`facingCamera(nx,nz)` = rotated normal's rx+rz > 0). Also lets all four sides work at any angle instead of inside-out geometry.
- **Depth sort must use `rx + rz`** (both rotated components), not rz alone — sorting on rz mis-orders blocks sharing a row. Ties break on `y`.
- Terrain re-renders into an offscreen canvas only when the camera key (`az|zoom`) changes; idle frames blit + draw ~40 dynamic paths. `computeView` projects all block corners each camera change so a rotated island can never clip the band.
- **Any overlay positioned over an interactive canvas needs `pointer-events-none`** — the hint pill sat exactly where the e2e drag started and silently swallowed the pointerdown (orbit test failed with az unchanged). Same for the fig caption.
- Determinism: index math, no `Math.random` (SSR/screenshots/videos reproducible). Pool cells ARE valid wander targets (the ghost floats over water anyway) — keeps click targets deterministic for tests.
- **`<footer>` inside `<main>` has NO implicit `contentinfo` role** (HTML-AAM) — `getByRole('contentinfo')` finds nothing on every public page; use `page.locator('footer')`.
- **Hoisted `function` declarations lose TS null-narrowing of captured `const`s.** Inside a `useEffect` after `if (!ctx) return`, nested `function`s referencing `ctx` still error TS18047. Fix: const arrows after the guard. Also true for reassignable `let hop` — capture `const h = hop` before using it inside a nested arrow.

## E2E
- e2e-17 (`tests/e2e-17-not-found.spec.ts`, 5 tests): 4-route sweep (real HTTP 404, painted canvas, chrome, console hygiene), reduced-motion static frame, animation-alive (two canvas captures 400ms apart differ), 390px mobile composition, and **interaction** (drag→azimuth moves >15°, wheel→zoom increases, click→`data-hops` increments). Run via the override config only.
- **`playwright.notfound.config.ts`** — no `webServer`/`globalSetup`, so it never spawns dev servers. The MAIN `playwright.config.ts` auto-starts backend+frontend+admin when they're down.
- **ffmpeg**: system-wide 9.0.1 installed via brew (2026-09-09). Playwright's bundled `~/Library/Caches/ms-playwright/ffmpeg-1011` is **mux-only** — no `fps` filter, can't decode webm→png, useless for frame extraction. For analysis: `ffmpeg -i in.webm -vf fps=1.5 out-%03d.png`, and `crop=1280:400:0:0` to isolate the scene band from full-page shots. Periodic PNG screenshots during a scripted interaction beat video frames for still analysis (uncompressed).
- Playwright's own `error-context.md` (page YAML snapshot) — read it before theorising; it showed the page was perfect and only my locator was wrong.
