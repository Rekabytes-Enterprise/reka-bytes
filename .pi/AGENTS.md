# Reka Bytes — Memory

## What this is
Academy platform teaching non-CS people to vibe code properly. Founder: SWE grad + Google Certified PM.
**Shipped**: Phase 0 MVP · Phase 1 (Classroom + AI Masterclass) · AI Masterclass v2 BAML pipeline (real-AI verified 2026-08-23) · v2.1 outline checkpoint + generation animations · v2.2 long-screen redesign (structured analysis panel, capped log, collapsible modules) · Phase A Interactive Lesson Engine (typed blocks, E2E 16/16) · PRD-03 (auto-complete + admin console + lesson polish) · **PRD-04 (Soft Terminal reskin + XP ledger + gamification UI, 22/22 E2E green, shipped 2026-08-25)**.

- Roadmap: `docs/development/PRD.md` (phases 0–5) · Phase 1 spec `PRD-02.md` · `PRD-03.md` (shipped 2026-08-25) · `PRD-04.md` (shipped — R1 reskin → R2 data → R3 game UI; e2e-16 added)
- Design system ("Terminal Editorial"): `docs/development/DESIGN.md` (§5a Soft Terminal geometry + §5b gamification visual language for the student app; landing stays blueprint)
- **Next cycle: Phase B** — simulation template library (`docs/development/LESSON-PLAN.md` §11) + one real-AI WriteLesson smoke to validate v3 schema on the live model.

## Architecture
pnpm monorepo, Node 22 / pnpm 11.9. Ports: backend **4300** (Hono), frontend **4301** (Next 16), admin **4302** (Next 16).
`docker compose up -d` = postgres (**host port 5433** — 5432 taken!) + redis (**host 6380**). Each package owns its `.env` (examples committed); run `pnpm dev` inside each package dir. Admin login = backend `.env` creds; e2e env-loader reads backend/.env.

**Docker + releases (2026-09-11, shipped)** — `docker/{backend,frontend,admin}.Dockerfile` (root build context), `.dockerignore`, `.github/workflows/release.yml`. Tag `v*` → builds `ghcr.io/rekabytes-enterprise/reka-bytes-{backend,frontend,admin}` (tags: `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest`). Deployment guide: `docs/development/DEPLOY.md` (Coolify, env tables, pre-deploy migrate `pnpm --filter @reka-bytes/db deploy`).

**CI gate (2026-09-11)** — `.github/workflows/ci.yml`: push/PR on `dev` (+ manual) → `pnpm install --frozen-lockfile` → **`pnpm --filter @reka-bytes/db generate`** → `pnpm -r typecheck`, `pnpm -r lint`, `pnpm format:check`. The generate step is REQUIRED: `db/src/generated` is gitignored, so fresh CI clones lack the Prisma client (first CI run failed TS2307 before this fix, `fe69d07` — Dockerfiles already generated in-image, CI now matches). Prettier 3.9 root devDep, config `.prettierrc` (singleQuote, printWidth 100, proseWrap preserve), `.prettierignore` (excludes generated code, baml_client, env files, lockfile, artifacts, docs NOT excluded — md formatted with prose preserve). Scripts: `format` / `format:check` (both `--ignore-unknown`). Repo formatted once (136 files) — eslint clean after. NOTE: repo has NO `dev` branch yet — CI won't fire until it's created; currently only `main`. Facts: Next apps use **`output: 'standalone'` + `outputFileTracingRoot`** in next.config (no dev impact) → tiny images ~98MB compressed; backend image is **full workspace incl. devDeps by design** (~373MB compressed) — tsx is a devDep AND prisma CLI ships for Coolify pre-deploy migrations; prisma generate runs in-image (`db/src/generated` gitignored), `baml_client` committed (no BAML step); base = **node:22-bookworm-slim, never alpine** (baml native binding + Prisma engines need glibc); pnpm baked via corepack (`corepack prepare pnpm@11.9.0` — sync with root `packageManager` when bumping); standalone needs `HOSTNAME=0.0.0.0` baked; `.dockerignore` excludes ALL `.env*` (except examples) — env is runtime-only. **Backend CMD = `scripts/start.sh` (mokara-style, 2026-09-12): `prisma migrate deploy` runs on EVERY container start before tsx — never rely on a Coolify pre-deploy field or manual terminal runs (v0.1.1 prod 500'd P2021 until migrations were run by hand); `exec` keeps SIGTERM reaching tsx for graceful shutdown.** e2e package.json IS copied in deps stage (frozen-lockfile needs importer present). Verified: all 3 images build locally + smoke-run (backend `/health` 200, frontend `/` 200 with site-nav, admin `/login` 200). First GHCR push = private packages.

- `packages/shared` — zod schemas, `AppError`, envelope `{data}|{error}`, DTOs. **`apiFetch` auto-stringifies `body` — never pass `JSON.stringify(...)`** (double-encoding → zod 400). `formatApiError` (error-format.ts) powers all error toasts.
- `packages/db` — Prisma 7.9 (`prisma-client` → `src/generated/prisma`, pg adapter). Classroom models + `BlockEvent` (append-only telemetry). **`toJsonInput` (src/json.ts) for every Json-column write.** Prisma 7: `_count` excludes one-to-one; orderBy rejects readonly tuples; **generator does NOT auto-regenerate on `migrate dev` — run `pnpm --filter @reka-bytes/db generate`** after schema edits.
- **Cohorts own capacity** (2026-09-12): `Cohort.cap` per intake, applications stamped with `cohortId` at registration, cap checks (register + approve) count APPROVED via `application.cohortId` — always scoped to the application's own cohort, never a global count. Exactly one `isCurrent` cohort (registration target + seats meter). Admin CRUD at `/api/admin/cohorts*` + `/cohorts` page. Never reintroduce a global capacity constant. For transaction reads inside `prisma.$transaction`, query `tx.cohort`/`tx.user` directly (race safety), not the service helpers.
- Backend: Hono, cookie `rb_session`, typed `AppEnv` context (`{ Variables: { user: AuthedUser } }`). Middleware `requireAuth/requireAdmin/requireApproved` + `requireRealStudent` (blocks synthetic env-admin from progress writes). Routes `/api/learn/*`, `/api/admin/*` (content CRUD, AI at `/api/admin/ai`).
- **Same-origin `/api` proxy = catch-all route handler, NEVER `next.config.ts` rewrites** (2026-09-12, both Next apps): rewrites destinations are evaluated at BUILD time — a published image gets `BACKEND_URL` baked in and Coolify runtime env can never change it (prod 500, backend blind). `src/app/api/[...path]/route.ts` + `src/lib/backend-url.ts` (mokara PRD-07 §4 port): runtime read, 503 `api_misconfigured` when unset in prod, 502 `network_error` JSON when backend unreachable. Any new Next app in this monorepo copies this pattern; `NEXT_PUBLIC_*` vars are build-time inlined — never use them for backend URLs.
- **Scenes (PRD-06, 2026-09-13)**: AI emits ≤1 `widget` block/lesson; `services/scene-hardening.ts` gates + injects CSP/reporter into stored HTML (idempotent, `data-rb-scene="bridge"`); render ONLY via `scene-frame.tsx` sandbox iframe (`allow-scripts`, never allow-same-origin, never raw-inject into our DOM); `reviewed:false` until admin acknowledges (editor scenes section = immediate blocks-only PUT); admin html edit resets review; mock fixture hardens itself (bypasses toLessonBlocks). In transactions/reads that need race safety, query `tx` directly, not service helpers.
- **Quiz + inline-check security**: `correctIndex` AND `explanation` never leave the server pre-submit (`sanitizeBlocksForStudent`); grading server-side only.
- Frontend: `(student)/` route group, guard hook, sidebar ≥md / drawer <md. Lesson viewer react-markdown + remark-gfm + rehype-highlight, NO rehype-raw (XSS boundary); YouTube-only embeds.
- Admin: `(console)` route group (login outside it — unmatched routes render OUTSIDE the group, which was the "sidebar disappears" bug). `/content` tree editor, `/students`, `/analytics`, `/applications`, 5-step `/ai-masterclass` wizard (jotai `components/ai/state.ts`: atomWithStorage + `useHydrateAtoms`).
- Server state in both apps goes through **`useApiQuery`/`useAdminQuery`** (`packages/{frontend,admin}/src/hooks/api-query.ts`) — see Coding rules.
- pnpm-workspace.yaml has an `allowBuilds` map — new native deps may need entries (placeholder strings break install).

## Gamification layer (PRD-04, 2026-08-25)
- Schema: `XpEvent` append-only (`@@unique([userId, reason, refId])` → idempotent awards). Migration `20260826134240_xp_events`. `pnpm --filter @reka-bytes/db generate` after migrate.
- Backfill: `packages/db/scripts/xp-backfill.ts` (tsx). **Copies original timestamps** from LessonProgress / QuizAttempt so streaks + badges reflect real history. Re-run is a no-op.
- Pure functions in `packages/shared/src/game/`: `levels.ts` (`T(n)=50·n·(n+1)`, L1@0, L2@300, L3@600, L4@1000…), `streaks.ts` (UTC-day, yesterday grace, longest run, comeback ≥5d gap), `badges.ts` (10 derived predicates, NO unlock storage), `profile.ts` (`buildGameProfile` composer). Tests via `tsx --test`: `pnpm --filter @reka-bytes/shared test` — 22/22.
- Award rules: LESSON_COMPLETED 50, MODULE_COMPLETED +100, CLASS_COMPLETED +250, QUIZ_PASSED 100 (first pass only), PERFECT_QUIZ +50 (first 100 only). Inline-checks award 0 XP (anti-farm) but count as streak activity.
- Wired fire-and-forget from `learn.service.ts`: `awardLessonCompletion` in `completeLesson` + `checkInlineAnswer` auto-complete; `awardQuizAttempt` in `submitQuiz`. P2002 swallowed silently.
- DTO: `LearnDashboardDTO.game: GameProfileDTO` (xp/streak/badges) + `quizAvgScore`. Stateless server; celebrations diff against `localStorage['rb-last-seen-badges']` — first call primes, subsequent diffs fire confetti+toast for new keys.
- UI: `packages/frontend/src/components/student/game/` (LevelPill, XpBar, StreakCard, QuizAvgCard, BadgeGrid, LevelRing). `lib/celebrations.tsx` mounts `XpToastHost` (event-bus pattern). `lib/badge-diff.ts` hook (`useBadgeDiff(keys, enabled)` — pass `enabled=!!data` to avoid first-load false-diffs). Reduced-motion gates both confetti and XP toasts.
- e2e-16 covers full XP loop (lesson → toast → dashboard → DB XpEvent rows).

## AI Masterclass v2 — packages/baml (BAML 0.226.1)
- Pipeline per job: extract PDF → chunk (4k chars, 300 overlap, max 40) → `AnalyzeDocument` → `GenerateOutline` → **pause at `awaiting_approval`** (outline checkpoint; approve → fire-and-forget `resumeGeneration` = lessons (concurrency 4) → quizzes → single transactional write; `regenerate-outline` re-runs outline only, stays paused; Redis TTL 2h; upload file deleted only after resume persists).
- Lesson prompt mandates teaching structure (why → concept w/ defined terms → walkthrough → mistakes → try → recap, 600–1200 words). **Quizzes generated FROM written lessons, not the PDF.**
- `AI_MOCK=1` bypasses BAML (deterministic fixture, still exercises the outline checkpoint) — e2e unaffected by model issues. Real-AI smoke: `packages/backend/scripts/ai-smoke.ts`.
- Job payload `rb:aigen:{jobId}` (Redis TTL 2h) carries outline, structured `analysis: AIAnalysisDTO`, legacy `reviewNotes`, `sourceChunks` (regen endpoints; per-lesson regen falls back to existing markdown if job expired).
- Generation animations: stages DERIVED by prefix-matching progress strings (`Extracting…`, `Analysis done`, `Outline ready`, `Wrote lesson i/n`, `Generating quiz`, `Writing class to database`) — **if backend wording changes, update PATTERNS in stage-tracker.tsx**. Step-2 polling is uncapped (stop = done/error/5 consecutive status failures).
- `withBamlRetry` wraps ALL passes: retries `BamlValidationError` + `BamlClientHttpError` (network/timeout/429/5xx) 2× exponential back-off; empty block results degrade to prose.

### BAML 0.226 gotchas (hard-won — do not relearn)
- Generator block: `output_type "typescript"` (no `=`), explicit `version`, `module_format "esm"`; output_dir ".." → `packages/baml/baml_client`. Generated client takes POSITIONAL args.
- No `ctx.format_chunks`/`ctx.format_output` — use Jinja loops; enum values ALL CAPS; attributes go AFTER fields (`field type @description(...)`); retry_policy declared top-level, referenced from the CLIENT block.
- **Rust env resolution unreliable → never `env.X` in .baml.** Pass a programmatic `ClientRegistry` per call (built in `backend/src/services/ai/baml-env.ts`, sets `default_role: 'user'` — stealth/ox-alpha rejects system-only conversations).
- `BamlValidationError` lives in `@boundaryml/baml/errors`, NOT the main entry — re-export from `packages/baml/src/index.ts`.
- Reasoning model SLOW: ~150–240s/pass; full class 15–40 min. `AI_TIMEOUT_MS` (0 = infinite) sets request timeout via the nested http block.
- **Timeouts are read ONLY from a nested `http: {}` block** — flat keys (`timeout`, `request_timeout_ms`, …) are SILENTLY IGNORED but still echoed into request logs (deeply misleading). No http block ⇒ 300s default ⇒ the ~300002ms WriteLesson deaths. Non-negative ms; 0 = infinite; idle/ttft are streaming-only opt-ins. Probe method: `request_timeout_ms: 5000` → deterministic failure at ~5005ms.
- **Prompt delimiter is `#" ... "#` — never put `"#` inside prompt text** (terminates the string early; the parser then blames the NEXT top-level construct). Use single quotes/backticks for in-prompt examples.
- **v3 WrittenLesson = flat `LessonBlockRaw` class** (not a tagged union — LLMs emit flat shapes more reliably). ALL-CAPS enum → lowercase `type` mapped in ONE place (`toLessonBlocks`); `contentMarkdown` DERIVED via `flattenBlocksToMarkdown` — never let the model return both.
- Zod v4: `.omit()` fails on schemas with `superRefine` — define the sanitized schema separately.

## Verified state (2026-08-25)
- `pnpm -r typecheck` ✅ · lint ✅ · admin + frontend builds ✅ · **E2E 8/8** (e2e-09 ×3, e2e-14 ×1, e2e-15 ×4) against live dev servers. e2e-13 needs an `AI_MOCK=1` backend (environmental — see state.md).
- Zero `as any`; chained casts only in the 2 audited exemptions (`db/src/index.ts`, `db/src/json.ts`); ESLint bans verified with a negative test.
- Migrations: `20260825034407_block_events`. Backfill ran once: 19 lessons → typed blocks (11 prose-fallback, idempotent).
- AI_MOCK fixture lesson 1 has ≥1 mermaid + ≥2 inline-checks (Phase A exit criteria under mock mode).

## Decisions (distilled — implementation details live in the code)
- 2026-08-25: **Server state via `useApiQuery`/`useAdminQuery`** — writable atom seeded `{state:'loading'}`, **`atom.onMount` runs the fetch** (userland pattern: `loadable` is deprecated in jotai 2.20 / removed in v3, and `unwrap` doesn't exist in 2.20.x — never use loadable). `useMemo([path, skip, refresh])` recreation = refetch on path change + `reload()`. Auto-toasts via `formatApiError`; admin variant redirects 401/403/0 → /login. Migrated 12 pages + class-detail.
- 2026-08-25: **Cast hygiene** — `toJsonInput` replaced 7 Prisma Json double-casts (undefined passes through → field-skip semantics survive); typed `AppEnv` Hono contexts replaced the `authedUser` cast; ESLint bans `as any` + chained casts in all 5 packages (exemptions: db/src/index.ts Prisma dev-global, db/src/json.ts helper).
- 2026-08-25: **ConfirmDialog** replaced all 4 `window.confirm()`s — accessible `role="alertdialog"`, AnimatePresence, Escape/backdrop close, testids `confirm-dialog{,-cancel,-confirm}`; Button gained `variant="danger"`.
- 2026-08-25: **PRD-03 shipped** — auto-complete (lesson completes when every inline-check ATTEMPTED; `onLessonCompleted` threads registry → BlockRenderer → viewer), admin console (`/students` search/detail, `/analytics` completion bars + check heatmap + quiz stats, `/applications` full list, branded 404, dashboard slimmed), lesson polish (sticky nav, 72ch measure, reveal-in).
- 2026-08-25: **BlockEvent telemetry** — append-only model instead of LessonProgress columns (its `completedAt @default(now())` would falsely mark complete); fire-and-forget `{blockIndex, answer, correct}` write in `checkInlineAnswer`.
- 2026-08-25: **Env-admin hardening** — `requireRealStudent` → clean 403 on progress writes (env-admin has no DB row; was FK-violation 500s). User's "progress not tracking" = logged in as env-admin.
- 2026-08-25: **Live-class E2E pattern** — e2e-14 tests the REAL "Vibe Coding Testing 6" class (fresh approved student, cookie-injected session, raw pg assertions, artifacts/) alongside synthetic e2e-09.
- 2026-08-25: **Phase A blocks** — every lesson is a typed `Lesson.blocks` JSON array (prose, callout, key-terms, comparison, mermaid, steps, inline-check, exercise, simulation, widget, recap); markdown kept as derived fallback; /learn module map advisory.
- 2026-08-24: **No frontend poll cap** in step 2 — stop conditions: done / awaiting_approval / error / 5 consecutive failures. Reasoning segments legitimately run 15–40 min; the job lives server-side (Redis 2h) regardless of the tab.
- 2026-08-24: **Outline checkpoint** — splits a 15–25 min generation into two <10-min segments and catches bad outlines before burning lesson cost. Job TTL 30min→2h (human controls the wait).
- 2026-08-23: **BAML multi-pass** (analyze → outline → lessons → quizzes) replaced single-shot — depth over summary; ClientRegistry-per-call (nothing hardcoded); quizzes from final lessons guarantee answerability.
- 2026-08-25: Fast-model profile REMOVED (user decision) — single registry, all passes use `AI_MODEL`.
- 2026-08-27: **Session-leak fix shipped (admin identity into student app)** — dedicated `POST /api/admin/login` (`backend/src/routes/admin-auth.routes.ts`, mounted BEFORE the requireAdmin-guarded `adminRoutes` in index.ts); shared `POST /api/auth/login` no longer carries the env-admin fallback → student surfaces can no longer mint an ADMIN session at all. Root cause had 3 compounding gaps: (1) global `matchesEnvAdmin` shortcut in shared login, reachable from ANY form; (2) ONE `rb_session` cookie per hostname — cookies are NOT port-scoped and both Next apps proxy `/api/*` via rewrites, so :4301/:4302 share a jar entry and last login wins; (3) `useStudentGuard` only checked `status==='APPROVED'` while `envAdminUser()` returns APPROVED+ADMIN. Hardening added: guard rejects `role==='ADMIN'` (toast + `/login`, no sessionAtom write); student login page defensively drops ADMIN responses; admin console posts to the new endpoint (dead role-check branch removed). Local-dev mitigation habit: browse admin at `127.0.0.1:4302` vs frontend `localhost:4301` (different hostnames = separate cookie jars; prod uses distinct subdomains). DB probe during diagnosis: 42 users all role=USER, no collision with ADMIN_EMAIL; `resolveSessionUser` re-reads DB per request so JWT role-tampering is inert. NEVER re-add privileged shortcuts to shared login endpoints — every surface shares them.
- 2026-08-27: **Light theme shipped (frontend-only, single palette)** — user-requested color-only flip of `packages/frontend` (no toggle/hook/wiring added). Tokens in `packages/frontend/src/app/globals.css` `@theme` swapped to "Soft Terminal: Paper": `canvas #FAFAF7`, `elevated #FFFFFF`, `inset #F0F1EC`, `ink #14161A` (17.3:1 on canvas), `muted #565E66` (6.3:1), `faint #9AA1A9` (2.5:1 — placeholders only, mirrors dark faint's 2.45:1 role), `accent #4E7700` (deep olive lime, hue ~81°, brand lime was 78°; 5.3:1 on white, 4.7:1 on inset), `accent-hover #3E6200` (7.1:1), `accent-dim #558006` (4.7:1), `accent-ink #FFFFFF`, `success #15803D` (5.0:1), `warning #A16207` (4.9:1), `danger #DC2626` (4.8:1), `info #0369A1` (5.9:1), `line #E3E5DE`, `line-strong #C6CAC0`. Recipes flipped: `color-scheme: light`, paper-realistic shadows (`rgb(20 22 26 / 0.08/0.14)` instead of black ambient 0.35/0.45), `.blueprint-grid` lines `rgb(20 22 26 / 0.05)`, `.glow-accent` wash `rgb(198 255 74 / 0.16)`. Hardcoded dark spots fixed: `components/landing/byte-stream.tsx` (clearColor + bit colors → `#FAFAF7` paper + olive accent + mid-grey mono), `components/landing/instructor-flow.tsx` (local light palette literal — does NOT import `shared/colors` because admin also uses it), `lib/celebrations.tsx` (fallback hex + ink for the 3rd confetti piece so it reads on paper). All text contrast WCAG AA. Verified: `pnpm typecheck` ✅ · `lint` ✅ · frontend build 9/9 routes ✅. No functional changes: `useTheme` hook + `themeModeAtom` untouched (mode is dark in storage but unused — `isDark: true` hardcoded). DESIGN.md §2 still says "Dark-first; light mode arrives in Phase 4" — frontend is now light, shared/admin still dark. To re-introduce a toggle later: switch frontend `@theme` to `[data-theme="dark"]` / `[data-theme="light"]` variants on `<html>` + update `useTheme` to set the attribute.
- **Step 3 infinite-loop gotcha**: never put `wizard` (object) in a dependency array — it's a new object every render; depend on `wizard.jobId` (primitive).

## Coding rules

### No `as any`
- `@typescript-eslint/no-explicit-any: error` in every package (enforced).
- Chained casts (`a as X as Y`, `as unknown as Z`) banned via `no-restricted-syntax` in every `eslint.config.mjs`.
- Two audited exemptions, both intentional and commented: `packages/db/src/index.ts` (canonical Prisma dev-global) and `packages/db/src/json.ts` (the audited cast inside `toJsonInput`).
- Need a cast? Use a typed helper (`toJsonInput`, `formatApiError`), restructure the type, or use a typed context (Hono `AppEnv`).

### `useEffect` is the last resort
1. **Jotai state** — server state via `useApiQuery`/`useAdminQuery`; shared UI state via atoms; mutations refresh via `reload()`.
2. **Derived state** — compute during render (e.g. `effectiveClassId` in analytics — auto-select as pure expression, not effect).
3. **`useApiQuery`** — all server fetches; guard-gated via `state === 'ready' ? path : null`.
4. **`useEffect`** ONLY for: external-system sync (timers, matchMedia, WebGL/canvas, mermaid), window/document listeners, lifecycle redirects not expressible as derived, syncing local edit state from server data (`setTitle(cls.title)` pattern).
5. Forbidden: `useEffect` to kick off a one-shot fetch.

### Jotai atom conventions
- **Never init atoms at module scope** with browser globals — SSR mismatch. Use `atomWithStorage(key, initial, storage, { getOnInit: false })` + `useHydrateAtoms` in a one-shot mount hook (see `admin/components/ai/state.ts`).
- **`useHydrateAtoms` values must be DESERIALIZED** — it bypasses the storage serializer. `createJSONStorage` persists JSON-ENCODED values, so hydrating the raw `sessionStorage.getItem` string double-encodes (`"abc"` → `"\"abc\""`) and `clear()`'s stored `"null"` hydrates as a truthy string. `readPersisted()` JSON.parses and accepts only string results.
- **`loadable` is DEPRECATED (jotai 2.20, removed v3) — never use it** (`unwrap` doesn't exist in 2.20.x). Use the userland pattern: writable atom seeded `{state:'loading'}` whose **`onMount`** fetches and writes the settled result (`createQueryAtom` in api-query.ts). No suspense, no effect-for-fetching, cleanup cancels stale writes.
- **`onError` callbacks** — store in a `useRef` (assigned during render) so the toast effect doesn't re-fire when callers pass inline handlers.

### Error handling
- Errors from `apiFetch` are `ApiClientError` (apps) or `AppError` (backend) — same `{status, code, message, details?}` shape.
- `useToastError()` is AppError-aware via `formatApiError` (code/status/first detail in description); it backs `useApiQuery`'s auto-toast.
- Backend: `throw AppError.notFound(...)` etc. Never `throw 'string'`.

### New-page checklist
- [ ] Fetches → `useApiQuery<T>(path, { skip, toastError, onError })`; guard-gated → `state === 'ready' ? path : null`
- [ ] Mutations → imperative `apiFetch(...)` + `reload()`
- [ ] Errors → auto-toast; `toastError: false` only when the page has inline error UI
- [ ] No `useEffect` fetching · no `window.confirm` (use ConfirmDialog) · no `as any` · no chained casts

### E2E tests require explicit permission
- **Never run `pnpm test:e2e`, `npx playwright test`, or any end-to-end suite without the user explicitly asking in the current turn.**
- E2E suites are heavy: browser automation, can burn real AI quota (e2e-13 needs `AI_MOCK=1` or hits daily limits), take 1–15 minutes, and touch shared state (cookies, Redis seats).
- **Default verification** after a change = `pnpm -r typecheck`, `pnpm -r lint`, `pnpm build` for affected packages, shared unit tests (`pnpm --filter @reka-bytes/shared test`), and short-lived `curl` probes against the user's already-running dev servers. All exit immediately.
- E2E is the user's call — they decide when to re-verify. The dev-server-never-start rule applies to all sessions regardless of who triggered it.
- Applies to visual probes, screenshot capture, and any other Playwright-driven activity too — not just `test()` runs.
- **Isolated/visual specs must use the override config**: `npx playwright test --config=playwright.notfound.config.ts tests/<spec>` (no `webServer`, no `globalSetup` — it never spawns dev servers; it fails fast instead). The MAIN `playwright.config.ts` auto-starts backend+frontend+admin whenever they are down — never invoke it casually. Probe `:4301` with curl first.

## Known loose ends
- Frontend globals.css still has an unlayered `:focus-visible` rule (admin fixed via `@layer base`; unlayered beats Tailwind utilities → double rings).
- Flat quiz endpoint deferred — quiz-editor still scans all classes with its own fetch effect (last un-migrated page).
- Two dialog implementations coexist: shared `ConfirmDialog` + the bespoke applications/[id] decision modal (has a Textarea; unify later if desired).
- Stage inference from progress strings is brittle by design — optional structured `stage` field on the job DTO.
- Daily AI limit (20/day, `rl:ai:*`) burned by repeated runs; if e2e-13 hangs on step 2, check "Daily AI limit reached" first.
- Quiz gating advisory (`Quiz.required` unused); drip release + Slides import deferred (PRD-02 §14).

## Next session should start with
PRD-04 R1a: Soft Terminal tokens/radii/elevation + Button/Badge/Card/Sidebar primitives in `packages/frontend` (`docs/development/PRD-04.md` §2/§8). Testids frozen; E2E must stay green. Phase B sims + real-AI smoke stay queued behind it.
