# State — 2026-09-16 (PRD-07 journal — Phases 1–3 implemented on dev; live e2e NOT run)

## Current state
- **2026-09-16: PRD-07 PUBLIC STUDIO JOURNAL IMPLEMENTED (Phases 1–3)** — committing + pushing this session.
  - `content/journal/` (new, committed): 2 published seed posts + 1 draft + start-ladder widget HTML + hand-authored SVG cover (image API out of credits — 402; replace with generated cover when credits return).
  - Shared: `schemas/journal.ts` (file parser + frontmatter zod `.strict()` + path rewriter + widget fence parser + read-time + DTOs) + `journal.test.ts` — **41/41 green**; js-yaml declared as a real dep.
  - Backend: `journal.service.ts` (60s in-memory cache, hardens widget HTML via lesson `hardenSceneHtml`, drafts 404 by slug, asset route = traversal-guarded + text/plain for widgets) + public routes (`/api/public/posts*`, `/journal-assets/*`) + admin `GET /api/admin/journal`.
  - Frontend: `/journal` + `/journal/[slug]` + `/journal/tag/[tag]` (force-dynamic server components, SSR metadata, real 404 via `notFound()`), `journal-markdown.tsx` (```widget fence → lesson `SceneFrameView` with reviewed:true — one-author rule), featured slot on `/` (client `useApiQuery`), footer `News → Journal` dead-link fixed.
  - Admin: `/journal` read-only console page + sidebar `Journal` (Newspaper) between Cohorts/Content.
  - Docker: no Dockerfile change needed — `COPY . .` already includes `content/`; path resolution is module-relative (verified dev == image layout).
  - E2E: specs **e2e-19** (main cfg), **e2e-20** (override `playwright.journal.config.ts`), **e2e-21** (main cfg) WRITTEN — **NOT RUN** (dev-server rule + AI/e2e is user's call). Deviations documented in PRD-07 §11.
- **Verification this session**: `pnpm -r typecheck` ✅ 0 errors · `pnpm -r lint` ✅ · `pnpm format:check` ✅ · shared tests 41/41 ✅ · frontend build ✅ (10 routes, journal ƒ, `/` still ○ static) · admin build ✅ · service-layer probe via tsx (list/featured/widget-inline/draft-404/traversal-404/text/plain hardening) ✅.
- **NOT verified**: HTTP-level probes (backend never started this session — servers down). First thing when servers come up: `curl :4300/api/public/posts`.
- Last pushed commit before this: `1aafd5d` (memory) on origin/dev.

## Next steps
1. Live-server smoke: backend up → `curl /api/public/posts` + `/posts/featured` + asset route; frontend `/journal` in browser. (User's call / when they start dev servers.)
2. Run e2e-19/21 (main config) + e2e-20 (journal override) — **explicit user permission required**.
3. Tag v0.1.6 → GHCR images include `content/journal` (backend image ships it via COPY . .) → prod journal live.
4. ~~Replace SVG cover with generated PNG~~ — DONE 2026-09-17: photoreal ChatGPT covers for both published posts (drop zone `content/img/` gitignored; optimized to `cover.jpg` ≤200 KB; skill updated with the PHOTO COVER branch).
5. Main-page content backlog (portfolio/showcase, FAQ, WhatsApp CTA) — unchanged.
6. Phase B (simulation template library, LESSON-PLAN §11) still queued.

## Blocked / waiting on
Nothing — user's call on e2e runs + deploy tag.