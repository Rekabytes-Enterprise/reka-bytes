# PRD-07 — Public Studio Journal (MD-file journal with interactive widgets)

> **Prerequisite**: Read `PRD.md`, `PRD-06.md` (widget block infrastructure this
> PRD reuses), `DESIGN.md` §5a (Soft Terminal: Paper tokens), `LESSON-PLAN.md`.
> **Status**: **Implemented** (2026-09-16) — Phases 1–3 on `dev`; E2E specs
> 19/20/21 written, NOT yet run against live servers (user's call). See §11.
> **Slot**: Next available (PRD-06's "stepper lesson-flow" candidate yields).

---

## 1. Overview

**Problem**: the company site `/` (shipped `923321b`) is a marketing surface
with a lead funnel and zero editorial content. The founder (SWE + Google
Certified PM) is actively shipping — v0.1.0 through v0.1.5, the site split, the
leads funnel — and none of that velocity is captured anywhere a prospect can
find it. The lead funnel's success path ("see how we build") currently ends at
"here's our email" — there's nothing to link to.

**This PRD**: add a **public studio journal** at `/journal`, served from
Markdown files in the repo. Posts are version-controlled, PR-reviewed,
co-located with their images and embedded interactive widgets. The journal is
**interactive, not just articles** — authors embed sandboxed scenes (reusing
PRD-06 widget infrastructure) directly inside posts.

**Why MD files, not an admin CMS**:

- The brand promise is "build-in-public" — the commit IS the publication.
- One author (founder) means no multi-author bottleneck to remove.
- PR review is built-in quality control.
- Reuses git for history, blame, search, diff — all free.
- Zero new surface area to maintain in admin.

**What this PRD does NOT do** (explicitly, §8): comments, reactions,
subscriptions/RSS, search, multi-author, post scheduling, full WYSIWYG editor.

---

## 2. Current state (verified 2026-09-15)

- `/` is the company site (shipped `923321b`): app-dev studio marketing, lead
  funnel to `POST /api/public/leads`, admin triage at `/admin/leads`.
- `/academy` is the original landing page; `/academy/about` retained.
- AI Masterclass v2 + PRD-06 widget infrastructure shipped (uncommitted
  scene-hardening, scene-frame, widget block schema). These are the load-bearing
  pieces PRD-07 reuses for interactive journal content.
- Frontend is **Soft Terminal: Paper** (light theme). Design language is
  text-heavy by intent — no hero images anywhere on `/` or `/academy` today.
- Backend Dockerfile already COPYs `baml_src` into the image. Same pattern
  extends to journal content.

---

## 3. Phase 1 — Read-only journal (foundation)

**Goal**: a working journal at `/journal` with images, readable end-to-end. No
interactive widgets yet. E2E covers the full read flow.

**Exit criteria**:

- Posts authored as MD files in `content/journal/` render at `/journal/{slug}`.
- `/journal` lists published posts newest-first with excerpts.
- Featured slot on `/` surfaces one post before the lead form.
- Images co-located with posts render via `/api/public/journal-assets/{slug}/*`.
- Admin `/admin/journal` shows a read-only list with file paths.
- `docker build` for backend bundles `content/journal/` into the image.
- `e2e-19-journal.spec.ts` green via `playwright.config.ts`.

### 3.1 Storage layout (canonical)

```
content/journal/
  2026-09-15-shipping-v0.1.0.md
  2026-09-15-shipping-v0.1.0/
    docker-compose-diagram.png
    terminal-screenshot.png
```

Frontmatter schema (single source of truth for metadata; zod schema lives in
`packages/shared/src/schemas/journal.ts`):

```yaml
---
slug: shipping-v0.1.0 # url segment; must match filename minus date + .md
title: Shipping v0.1.0
excerpt: > # ≤ 280 chars, shown on cards
  Docker, GHCR, and the migrations
  story — what we shipped and what we learned.
publishedAt: 2026-09-15 # ISO date; sort key
featured: false # bool; at most one true across all posts
tags: [shipping, docker, lessons] # string[]; lower-case, kebab-case
coverImage: ./docker-compose-diagram.png # optional; relative to the post folder
status: published # draft | published; only published renders
---
```

**Filename convention**: `YYYY-MM-DD-{slug}.md`. The slug is in the filename
AND in frontmatter (must match) — guard rejects mismatches at startup.
**Post folder** is the date+slug prefix; assets live inside it. **Delete a
post, assets follow.**

### 3.2 Backend service

New `services/journal.service.ts` (parallel to `lead.service.ts`):

- **Startup**: scans `content/journal/*.md`, parses frontmatter (gray-matter
  already in dep tree via lessons — verify) + body, validates against zod
  schema. Bad files log a warning and are excluded (never crash the API).
- **Sort**: by `publishedAt desc`. `featured: true` posts sort to position 0
  regardless of date.
- **Filter**: `status === 'published'` only in public listings.
- **In-memory cache**: rebuilt on file mtime change OR every 60s (whichever
  first). No DB; no Redis.

### 3.3 Public API (mounted on existing `publicRoutes`)

| Method | Path                                  | Returns                                                                                                                               |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/public/posts`                   | `{ posts: PostSummary[] }` — slug, title, excerpt, publishedAt, tags, coverImage. Paginated: `?page=1&limit=10` (default 10, max 50). |
| GET    | `/api/public/posts/featured`          | `PostSummary \| null` — the one featured post.                                                                                        |
| GET    | `/api/public/posts/:slug`             | `{ post: PostDetail }` — full body (markdown string).                                                                                 |
| GET    | `/api/public/journal-assets/{slug}/*` | Static file stream from `content/journal/{slug-folder}/*`. Content-type by extension; `cache-control: public, max-age=300`.           |

**Path rewriter**: backend post-processes the markdown body in
`getPostBySlug` — rewrites `src="./..."` and `![](./...)` image refs to
`/api/public/journal-assets/{slug-folder}/...`. Transparent to author; the
renderer (existing `Markdown` component, react-markdown + remark-gfm) is
unchanged.

### 3.4 Frontend

Two new pages under `(student)` is **wrong** — journal is public. New route
group `(public)` is overkill. Plain pages under `/`:

- `/journal` (SSR via `useApiQuery`) — paginated list, newest first.
  Featured post gets a larger card at the top.
- `/journal/[slug]` — full post. Reuses `components/student/markdown.tsx`
  (the existing react-markdown renderer). NO `rehype-raw`. NO new renderer.

**Featured slot on `/`**:

- `packages/frontend/src/app/page.tsx` gains a `<FeaturedJournalPost>` server
  component (fetches `/api/public/posts/featured` at render).
- Renders between the "Why Reka Bytes" section and the lead form (`#start`).
- Title + excerpt + "Read on the journal →" button (→ `/journal/{slug}`).
- If `null` (no featured post yet), the section is hidden — not a "coming
  soon" placeholder.

### 3.5 Admin read-only preview

New page `/admin/journal` under `(console)`:

- Lists posts from the same in-memory cache (or refetches if cache is
  backend-private — see §3.5.1).
- Columns: title, publishedAt, status (DRAFT/PUBLISHED badge), featured,
  tags, file path.
- Each row links to the file path (for local dev) and to
  `https://github.com/rekabytes-enterprise/reka-bytes/edit/dev/content/journal/{file}`
  (one-click GitHub web editor).
- **No CRUD buttons**. (Confirms the "no admin CMS" decision.) Read-only.
- New sidebar entry `Journal` (BookOpen icon) between `Cohorts` and `Leads`.

**§3.5.1 Cross-package access**: the cache lives in the backend process. The
admin `/admin/journal` page either:
(a) calls `GET /api/admin/journal` (a new admin route mirroring the public
list), or
(b) reads files via its own fs access (only works in dev — backend Dockerfile
bundles the files but admin doesn't).
**Pick (a)** — single source of truth, mirrors the Leads pattern, keeps the
admin dumb.

### 3.6 Deploy wiring

Backend Dockerfile (`docker/backend.Dockerfile`) gains one line, after the
existing `COPY` steps:

```dockerfile
COPY content/journal ./content/journal
```

That's it. New post → tag → image rebuilds + deploys. Acceptable for weekly
cadence; revisit volume mount if daily.

No new env vars. No new package deps (gray-matter already used by lesson
content; verify in lockfile).

### 3.7 E2E (e2e-19)

`packages/e2e/tests/e2e-19-journal.spec.ts` — main config, live dev servers.

| Test                 | What it asserts                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| List shows posts     | `/journal` renders ≥ 1 card with `journal-card-{slug}` testid, featured card has `journal-featured-card` testid |
| Slug page renders    | `/journal/{slug}` shows title (`journal-title`), markdown body, published date                                  |
| Featured slot on `/` | `/` shows `<FeaturedJournalPost>` section with link to post (`home-featured-journal`)                           |
| Image loads          | Co-located image in post body renders with `src` starting with `/api/public/journal-assets/`                    |
| Draft hidden         | A `status: draft` post in `content/journal/` does NOT appear on `/journal` list                                 |
| Admin read-only list | `/admin/journal` (authed as admin) lists posts with `journal-admin-row-{slug}` testid                           |
| Missing slug → 404   | `/journal/does-not-exist` → frontend not-found                                                                  |

Seed posts: ship 2 fixture posts in `content/journal/` (the two starter posts
we agreed on, e.g. "shipping v0.1.0" + "BAML vs raw OpenRouter"), one with a
featured flag, one draft. E2E depends on these being present at suite start.

---

## 4. Phase 2 — Interactive widgets (the differentiation)

**Goal**: a post author can embed a sandboxed interactive scene inside a
markdown post. Reuses **all** PRD-06 widget infrastructure (hardening, scene
frame, CSP, height reporter). E2E proves the round-trip.

**Exit criteria**:

- A `\`\`\`widget` code fence in a post renders a sandboxed iframe inline.
- The widget HTML is co-located with the post (`content/journal/{slug}/widgets/foo.html`).
- The widget passes through `hardenSceneHtml` (same as lessons) — CSP + reporter
  injected, idempotent.
- No `reviewed` gate for journal widgets — the author IS the admin (one-author
  build-in-public rule); commit = review.
- `fallbackMarkdown` shows when JS off, sandbox throws, or iframe errors.
- `e2e-20-journal-widgets.spec.ts` green via override config (no webServer).

### 4.1 Markdown extension

New fenced code block language: `widget`.

````markdown
Try the migration flow yourself:

```widget
src: ./widgets/migration-flow.html
title: Watch the migration flow run
brief: Click "run" and watch the steps execute
fallback: |
  When you hit migrate, prisma first diffs the schema, applies pending
  migrations in order, then regenerates the client. Each step is
  idempotent and the whole thing is wrapped in a transaction.
```
````

The renderer recognizes the fence via a small **remark plugin**
(`packages/frontend/src/components/student/journal-widget-remark.ts`).
The plugin:

1. Detects `code` nodes with `lang === 'widget'`.
2. Parses the body as YAML (4 simple string fields).
3. Replaces the node with a custom JSX-like marker that the renderer expands
   to `<JournalWidget {...props}>`.

**Why remark plugin (not backend rewrite)**: keeps the markdown in the DB
pristine; renderer is the only place that needs the new node type. Backend
stays a dumb file reader. Frontend renderer already has the surface to plug
into (it's how mermaid works in lessons).

### 4.2 Asset resolution

`src:` paths in widget fences are relative to the post folder. The remark
plugin resolves them at render time using the route's `slug` segment
(`/journal/[slug]`) → absolute URL `/api/public/journal-assets/{slug-folder}/widgets/foo.html`.

The backend asset route (`/api/public/journal-assets/{slug}/*`) already serves
files from `content/journal/{slug-folder}/*`. Widgets live in
`content/journal/{slug-folder}/widgets/*.html` — same route, different
sub-path. No new endpoint.

### 4.3 Reusing PRD-06 infrastructure

`packages/frontend/src/components/student/journal-widget.tsx` (new):

- On mount: `fetch(srcUrl).then(r => r.text()).then(setHtml)`.
- Passes `html` through the **same hardening pipeline as lessons**
  (server-side: `hardenSceneHtml` runs when the file is fetched via the asset
  route — wait, that's only at generation time. For journal, the HTML is
  static; we harden it ONCE at backend startup when caching the post body).
- Renders via the **same `SceneFrame`** (`scene-frame.tsx`).

**Hardening-on-cache**: extend `journal.service.ts` to apply
`hardenSceneHtml(content)` to each `*.html` file under
`content/journal/*/widgets/` at cache-build time. Inject CSP + reporter,
store the hardened version in memory. Idempotent via existing `data-rb-scene`
marker.

**No review gate**: skip the `reviewed` check in `SceneFrame` for journal —
pass a `skipReviewGate` prop, or make `reviewed` optional in the journal
context. Scene-frame itself is unchanged; the wrapper handles the prop.

### 4.4 E2E (e2e-20)

`packages/e2e/tests/e2e-20-journal-widgets.spec.ts` — **override config**
(`playwright.notfound.config.ts`-style, no webServer). Spec ships its own
fixture widget HTML in `tests/fixtures/journal-widget.html`.

| Test                        | What it asserts                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Widget fence renders iframe | `/journal/{slug-with-widget}` shows `journal-widget-{i}` testid with `iframe[sandbox="allow-scripts"]`                              |
| CSP present                 | Fetched `html` string contains the `Content-Security-Policy` meta (assert against fixture's stored version, not the iframe content) |
| Height reporter injected    | Hardened HTML contains the `data-rb-scene` script                                                                                   |
| Fallback path               | Render with JS disabled → `journal-fallback-{i}` testid visible                                                                     |
| Opaque origin               | Inside the iframe, accessing `top.document` throws (SecurityError) — `iframe.contentWindow.eval("typeof top.document")`             |
| No external requests        | Network log shows no requests to any host other than `127.0.0.1:4301` / `127.0.0.1:4300`                                            |

---

## 5. Phase 3 — Discovery & polish

**Goal**: the journal becomes navigable as it grows. Tags + pagination +
card polish. Each addition independently testable.

**Exit criteria**:

- `/journal?page=2` works; navigation UI present on `/journal`.
- `/journal/tag/{tag}` lists posts with that tag.
- Read-time estimate shown on each card ("~5 min").
- Cover image renders on list cards when present in frontmatter.
- `e2e-21-journal-discovery.spec.ts` green.

### 5.1 Pagination

- `/journal?page=1` (default). Page size = 10 (constant `JOURNAL_PAGE_SIZE`).
- Backend `GET /api/public/posts?page=N&limit=10` already supports it (§3.3).
- Frontend: prev/next buttons + page numbers. Tailwind pattern same as
  applications list (reuse `Pagination` component if one exists, else inline).
- No client-side routing — page changes are real navigations (SSR-friendly).

### 5.2 Tag pages

- `/journal/tag/{tag}` — same shape as `/journal`, filtered server-side.
- `GET /api/public/posts?tag=shipping` adds a tag filter.
- Tags also clickable from cards (`<Link href="/journal/tag/{tag}">`).
- Tag list derived from frontmatter; no separate tag taxonomy.

### 5.3 Read-time estimate

- Derived in the backend: `Math.max(1, Math.ceil(wordCount / 220))` minutes.
- Word count = `body.split(/\s+/).length` after stripping markdown noise
  (code fences, frontmatter, image refs).
- Computed at cache-build time, stored on `PostSummary` as `readMinutes: number`.

### 5.4 Cover images on cards

- Frontmatter `coverImage: ./foo.png` → resolved at render time to
  `/api/public/journal-assets/{slug-folder}/foo.png` (same rewriter as inline
  images, §3.3).
- Card layout: cover image top-left, title + excerpt right. Aspect ratio
  `16/9`, `object-fit: cover`. Soft Terminal: Paper tokens.
- If absent, card uses the existing text-only layout (no broken-image
  placeholder).

### 5.5 E2E (e2e-21)

`packages/e2e/tests/e2e-21-journal-discovery.spec.ts` — main config.

| Test               | What it asserts                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Pagination         | Seed 11 posts, `/journal` shows 10 cards, `journal-next-page` button → `/journal?page=2` shows 1 card                    |
| Tag page           | `/journal/tag/shipping` shows only posts with that tag; `journal-tag-{tag}` testid on each card                          |
| Tag link from card | Click tag on a card → `/journal/tag/{tag}`                                                                               |
| Read-time          | Card shows `journal-read-time` testid with format `~N min`                                                               |
| Cover image        | Post with `coverImage` renders `journal-card-cover-{slug}` testid, image `src` starts with `/api/public/journal-assets/` |

---

## 6. Rings (execution order)

| Ring  | Deliverable                                                                        | Exit                                                             |
| ----- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| P1.R1 | `content/journal/` seeded with 2 posts + 1 draft; frontmatter zod schema           | `pnpm --filter @reka-bytes/shared test` green                    |
| P1.R2 | `journal.service.ts` + 3 public routes; cache builds on startup                    | `curl /api/public/posts` returns ≥ 1 post                        |
| P1.R3 | Frontend `/journal`, `/journal/[slug]`, featured slot on `/`, admin read-only list | manual: load each page, see expected content                     |
| P1.R4 | Backend Dockerfile COPYs `content/journal/`; image smoke-tested                    | `docker build backend` + `curl /api/public/posts` from container |
| P1.R5 | `e2e-19` green                                                                     | `pnpm --filter @reka-bytes/e2e test` → all green                 |
| P2.R1 | Remark plugin for `\`\`\`widget` fence; backend hardens widget HTML at cache time  | unit test: fence → marker conversion                             |
| P2.R2 | `JournalWidget` + `SceneFrame` reuse; fallback path                                | fixture widget renders in iframe with hardened HTML              |
| P2.R3 | `e2e-20` green via override config                                                 | override config run → all green                                  |
| P3.R1 | Pagination + tag pages + read-time + cover images                                  | manual + `e2e-21`                                                |
| P3.R2 | `e2e-21` green                                                                     | main config run → all green                                      |

---

## 7. Testids (frozen)

- **List page**: `journal-featured-card`, `journal-card-{slug}`, `journal-card-cover-{slug}`, `journal-read-time`
- **Post page**: `journal-title`, `journal-published-at`, `journal-tags`, `journal-tag-{tag}`, `journal-back-link`
- **Widgets** (Phase 2): `journal-widget-{i}`, `journal-fallback-{i}`, `journal-widget-src-{i}`
- **Home featured**: `home-featured-journal`
- **Admin**: `journal-admin-row-{slug}`, `journal-admin-edit-github-{slug}`, `journal-admin-status-{slug}`
- **Pagination** (Phase 3): `journal-prev-page`, `journal-next-page`, `journal-page-{n}`

---

## 8. Risks & mitigations

| Risk                                                                                    | Mitigation                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown path rewriter misses an edge case (e.g. image inside a link, HTML-encoded src) | Backend logs all rewritten URLs at debug; fixture posts cover common cases; e2e covers image in body                                                                                   |
| Repo size grows with co-located images                                                  | Commit guidelines: prefer SVG/PNG ≤ 200 KB; defer git-lfs until needed; document in README                                                                                             |
| Featured slot on `/` shows stale post after cache TTL                                   | Cache rebuild on file mtime change (60s floor) — fine for v1; Phase 3+ can add revalidation webhook                                                                                    |
| Widget HTML fetched via asset route exposes raw (un-hardened) HTML                      | Hardening happens at cache-build in `journal.service.ts`, BEFORE the file is served. Asset route serves the hardened in-memory copy, not the disk file.                                |
| Frontmatter typo (`status: Published` capital P) breaks filtering                       | Zod schema uses `.default('draft')`; case-sensitive enum; startup logs warnings                                                                                                        |
| Multiple `featured: true` posts                                                         | Startup logs a warning; first-by-filename wins; documented in the seed guideline                                                                                                       |
| Author forgets to update filename when changing slug                                    | Filename ↔ frontmatter slug mismatch → startup log warning + post excluded                                                                                                             |
| `e2e-19` flakiness from seed posts being moved                                          | Seed posts ship committed in `content/journal/` (the editorial fixtures ARE the repo content); specs target their frozen slugs — moving a post must update the spec in the same commit |

---

## 9. Explicitly out of scope (this cycle)

- Comments / reactions / social layer
- RSS / email subscribe / Atom feed
- Search (full-text or tag-based)
- Multi-author, author profile pages, bylines beyond frontmatter
- Post scheduling / future `publishedAt`
- Draft preview server (status flag in frontmatter IS the gate)
- Rich text / WYSIWYG editor (intentional — commits are the editor)
- Image upload from admin (intentional — drop into the repo folder)
- Cross-post syndication (Medium, dev.to, Hashnode)
- Analytics (views, read-through, hot posts)
- A/B testing featured slot
- Full-text search
- Cover image CDN / on-the-fly resize via `sharp` (defer until post count > 20)

---

## 10. Decisions to record in `.pi/memory.md` when shipped

1. **Journal content lives in the repo as MD files with frontmatter.** No DB
   involvement for content. Admin `/admin/journal` is read-only — links to
   GitHub for editing.
2. **Co-located assets** — images and widget HTML live in
   `content/journal/{slug-folder}/`. Delete the MD, the assets go too.
3. **Widget blocks in journal bypass the admin review gate** (PRD-06 §4). The
   author is the admin (one-author build-in-public rule); commit = review.
   Reintroduce the gate when a guest author exists.
4. **Path rewriter lives in the backend, not the frontend** — markdown in DB
   is pristine; renderer is unchanged. Same rewriter handles inline images and
   widget `src:` paths.
5. **Markdown `\`\`\`widget` fence is the journal's widget primitive** —
   remark plugin in the renderer, not a backend preprocessing step.

---

## 11. Implementation notes (2026-09-16, Phases 1–3)

Deviations from the spec above, all deliberate:

1. **§3.6 Dockerfile**: no explicit `COPY content/journal` line — the backend
   build stage already does `COPY . .` and `.dockerignore` excludes nothing
   under `content/`. Path resolution is module-relative from the service file
   (identical in dev and the image); `JOURNAL_DIR` env var overrides.
2. **§3.4 featured slot is a client component** (`FeaturedJournalPost` +
   `useApiQuery`), not a server component — a build-time server fetch would
   reintroduce the v0.1.1 failure mode (prerender against an
   unreachable/wrong-baked BACKEND_URL). `/` stays ○ static; `/journal*` are
   ƒ dynamic server-rendered (force-dynamic) for real 404 + SSR metadata.
3. **§4.3 widgets need NO client fetch** — the post-detail DTO carries
   `widgetHtml: Record<assetUrl, hardenedHtml>` inline (backend collects the
   post's fences from its hardened cache). Fewer round-trips, no per-widget
   loading states. The asset route still serves widgets (as `text/plain`,
   hardened) for direct testing + future sharing.
4. **§7 testid change**: `journal-widget-src-{i}` replaced by a
   `data-rb-src="{assetUrl}"` attribute on the `journal-widget-{i}` wrapper
   (one element can only carry one `data-testid`).
5. **§5.5 pagination e2e** validates page math at the API (`?limit=2`,
   clamping beyond the end) instead of seeding 11 temporary posts — repo
   content stays a hand-authored editorial set. `packages/e2e/fixtures/
journal/` + global-setup copy is therefore NOT needed.
6. **Cover image**: seed posts ship a hand-authored SVG cover (the studio
   image API was out of credits at implementation time); the `journal-images`
   skill decision tree is unchanged.
7. **Admin sidebar**: `Journal` (Newspaper icon) sits between Cohorts and
   Content; the old dead footer link `News → /news` became
   `Journal → /journal`.
8. **Drafts 404 by slug** (not just list-hidden): `getPostBySlug` filters on
   `status === 'published'`, so a draft URL hits the branded 404 — no
   information leak that a slug exists.
