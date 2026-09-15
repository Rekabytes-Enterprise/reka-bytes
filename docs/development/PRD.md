# PRD — Reka Bytes

> **Reka** × **Bytes** — where creativity meets computer science fundamentals.
> Reka Bytes = the fundamentals behind vibe coding, taught properly.

| Field        | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| Product name | Reka Bytes                                                    |
| Type         | Academy / cohort-based vibe-coding school                     |
| Owner        | Founder (Software Engineer, Google Certified Project Manager) |
| Status       | Draft v2 — phased roadmap                                     |
| Design spec  | `docs/development/DESIGN.md`                                  |

---

## 1. Problem Statement

Most vibe coders ship software without any software engineering or computer science background. They can prompt AI to generate code, but they don't understand:

- What the AI actually generated (architecture, data flow, state)
- Why things break and how to debug them
- Basic engineering hygiene: structure, typing, error handling, versioning

This produces fragile projects, security risks, and users who get stuck the moment the "vibe" stops working.

## 2. Vision

Reka Bytes teaches **non-CS people how to vibe code properly** — pairing the speed of AI-assisted coding with the fundamentals a real engineer uses daily. Taught by a graduated software engineer with Google Certified Project Manager credentials. Start with a tiny, high-touch cohort (5 seats); grow into a full academy with structured classes, projects, and community.

## 3. Roadmap Overview

| Phase | Name               | Theme                                                              | Status    |
| ----- | ------------------ | ------------------------------------------------------------------ | --------- |
| **0** | Foundation         | Landing + registration + admin approval (5-seat cohort)            | ← current |
| **1** | Classroom          | Lesson delivery, progress tracking, quizzes                        | planned   |
| **2** | Craft              | Assignments, project reviews, certificates, showcase               | planned   |
| **3** | Community & Growth | Waitlist, payments, cohort 2+, email lifecycle                     | planned   |
| **4** | Academy            | Multiple classes, instructor tools, analytics, public site content | planned   |
| **5** | Scale              | PWA/mobile polish, public API, alumni network, marketplace         | future    |
|       | **PRD-02**         | Classroom + AI Masterclass                                         | shipped   |
|       | **PRD-03**         | Auto-complete + admin console + lesson polish                      | shipped   |
|       | **PRD-04**         | Soft Terminal reskin + XP ledger + gamification UI                 | shipped   |
|       | **PRD-05**         | Interactive Lesson Engine (typed blocks)                           | shipped   |
|       | **PRD-06**         | Sandboxed AI-authored scenes (widget blocks)                       | shipped   |
|       | **PRD-07**         | Public studio journal (`/journal`) — MD files + interactive widgets | draft (awaiting approval) |

Each phase ships **complete and usable on its own** — no half-built features carry over. Per-feature PRDs (PRD-NN) ship additively on top of a phase.

---

## Phase 0 — Foundation (MVP)

**Goal:** prove the funnel: visitor → applicant → approved student, with manual admin review.

### Scope

1. **Landing page** (`/`) — hero, value prop, curriculum outline (Basics), instructor bio, live seats-left counter, register CTA.
2. **Registration** (`/register`) — account details + 12-question intake questionnaire (Section 6), zod-validated, framer-motion step transitions.
3. **Auth** (`/login`) — email/password, httpOnly JWT cookie.
4. **Status page** (`/status`, authed) — live PENDING/APPROVED/REJECTED state with messaging.
5. **Admin app** — login, application list + filters, questionnaire detail view, approve/reject with internal note, cohort cap meter, audit log.
6. **Seat cap** — 5 approved users max, race-safe (Prisma transaction on register + approve).
7. **Discord delivery** — manual internal SOP after approval; system tracks decision only.
8. **Platform rules** (always-on, all phases): REST API, jotai state, framer-motion, shared global error envelope, no `as any`, `useEffect` last resort, per-package `.env`.

### Acceptance Criteria

- [ ] `docker compose up -d` → healthy postgres + redis only; apps run via `pnpm dev` per package (ports 4300/4301/4302).
- [ ] Full funnel works end-to-end; 6th registration blocked at cap (UI + API 409).
- [ ] Admin can review, approve/reject; decisions persist + audit-logged; cap cannot be exceeded concurrently.
- [ ] Shared error envelope used everywhere; zero unhandled rejections; toasts render all API errors.
- [ ] Playwright E2E suite green with video + screenshot artifacts (`packages/e2e/artifacts/`).
- [ ] ESLint passes with `no-explicit-any` enforced; every package ships `.env.example`.

### E2E Scenarios

| ID     | Test                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| E2E-01 | Visitor journey: landing renders → seats counter → navigate to register             |
| E2E-02 | Full registration: account + questionnaire → pending screen → login shows PENDING   |
| E2E-03 | Validation errors: invalid form → inline errors, no network call                    |
| E2E-04 | Admin approve: review answers → approve → student sees APPROVED                     |
| E2E-05 | Admin reject: reject with note → student sees REJECTED                              |
| E2E-06 | Seat cap: 5 approved seeded → register page shows "Cohort full"; API register → 409 |
| E2E-07 | Auth guards: unauth redirect; non-admin blocked from admin                          |

---

## Phase 1 — Classroom

**Goal:** approved students actually learn — the Basics class becomes real content.

### Scope

- **Lesson structure**: Basics class = modules → lessons. Content model: markdown/MDX body + video embed URL + estimated duration + order.
- **Lesson viewer** (`/learn`): sidebar module tree, lesson page with prose styling, video embed, "mark complete" toggle, prev/next navigation.
- **Progress tracking**: per-user lesson completion; module progress bar; "continue where you left off" on dashboard.
- **Quizzes**: 3–5 multiple-choice checkpoints per module; pass threshold 80%; retry allowed; stored per attempt.
- **Student dashboard** (`/dashboard`): overall progress ring, next lesson CTA, recent quiz scores, cohort announcement banner.
- **Admin content management**: CRUD for modules/lessons/quizzes in the admin app (rich-enough editor: markdown textarea + live preview is enough for Phase 1).
- **Drip release** (optional flag): lessons unlock on a schedule or sequentially — config per class.

### Data (new models)

`Class, Module, Lesson, Quiz, QuizQuestion, QuizAttempt, LessonProgress`

### Acceptance Criteria

- [ ] Student sees only approved-gated content; pending/rejected users blocked from `/learn`.
- [ ] Progress persists across sessions; dashboard reflects it accurately.
- [ ] Quiz pass/fail gates module completion (when enabled); attempts recorded.
- [ ] Admin can create/edit/reorder lessons without a deploy.
- [ ] E2E: student completes a lesson + passes a quiz → dashboard progress updates (video + screenshots).

---

## Phase 2 — Craft

**Goal:** turn knowledge into demonstrated skill — assignments, feedback, proof of work.

### Scope

- **Assignments**: per-module practical tasks ("vibe-code X, then explain the architecture AI generated"). Submission = repo URL + deployed URL + short reflection text.
- **Review workflow**: student submits → admin reviews → grade (pass / needs-revision + feedback note) → student sees feedback in dashboard; resubmit loop.
- **Certificates**: on completing all modules + passing all quizzes + all assignments passed → auto-generated certificate (unique verification code, public verify page `/verify/:code`).
- **Project showcase**: opted-in graduates get a public profile card (name, project links, cohort) on `/showcase` — doubles as social proof for marketing.
- **Notifications (in-app)**: bell icon + atom-fed notification center (assignment graded, new lesson available, cohort announcement). No email yet.

### Data (new models)

`Assignment, Submission, Review, Certificate, ShowcaseProfile, Notification`

### Acceptance Criteria

- [ ] Full submit → review → feedback → resubmit loop works; statuses always visible to student.
- [ ] Certificate only issues when all gates pass; verification page resolves valid codes, 404s invalid ones.
- [ ] Showcase is opt-in; student controls visibility.
- [ ] E2E: complete class → certificate issued → verify page → showcase opt-in renders publicly.

---

## Phase 3 — Community & Growth

**Goal:** open the funnel beyond 5 seats and make the business sustainable.

### Scope

- **Waitlist**: cohort-full state captures emails (with interest tags); admin can view/export; auto-invite next cohort.
- **Payments**: Stripe checkout for class enrollment (one-time price per cohort); webhook-verified enrollment; free cohort flag retained for early users.
- **Cohort 2+**: cohort entity becomes first-class — dates, seat cap, price, assigned class; registration targets a cohort.
- **Email lifecycle** (Resend or similar): welcome, application decision, cohort start reminder, assignment feedback, certificate delivery. Templates + send log.
- **Discord integration (semi-auto)**: approved+enrolled users get a one-time invite link generated per user (expiring single-use invite); still no bot — just tracked link delivery in-app.
- **Referral**: approved students get a personal referral code; referred applicants skip to top of waitlist review.

### Data (new models)

`WaitlistEntry, Cohort, Enrollment, Payment, EmailLog, InviteLink, ReferralCode`

### Acceptance Criteria

- [ ] Waitlist → cohort invite → payment → enrolled flow works end-to-end.
- [ ] Stripe webhook is the single source of truth for paid enrollment (idempotent).
- [ ] Emails send on the right triggers; failures logged + retryable from admin.
- [ ] E2E covers: waitlist capture, mock-checkout enrollment, invite link claim.

---

## Phase 4 — Academy

**Goal:** more than one class, more than one instructor — real academy operations.

### Scope

- **Multiple classes**: beyond Basics — e.g., "Architecture for Vibe Coders", "Debugging AI Code", "APIs & Databases Crash Course". Class catalog page with syllabus, prerequisites, pricing.
- **Instructor role + tools**: second admin tier (instructor) with content + review permissions but no user/payment admin.
- **Analytics dashboard (admin)**: funnel metrics (visitors → registration → approval → completion), lesson drop-off points, quiz difficulty stats, cohort completion rates.
- **Content marketing**: blog/notes section (`/notes`) — MDX posts on vibe-coding fundamentals; SEO meta + sitemap; doubles as top-of-funnel.
- **Scheduling**: live session calendar (Google Calendar embed / ICS download) for cohort calls.
- **Feedback loops**: NPS-style pulse after each module; lesson-level ratings.

### Acceptance Criteria

- [ ] ≥2 classes live with independent cohorts, content, and pricing.
- [ ] Instructor can run content + reviews without touching admin-only areas.
- [ ] Analytics dashboard answers: where do students drop off, which quizzes are too hard.
- [ ] Blog posts render with proper SEO tags; indexed pages verified.

---

## Phase 5 — Scale (future / opportunistic)

- **PWA**: installable app, offline lesson reading (cached MDX), push notifications for announcements.
- **Public API + API keys**: read-only endpoints for graduates to showcase progress badges.
- **Alumni network**: graduate directory, mentor matching (alumni mentor new cohorts), testimonial pipeline.
- **Marketplace seeds**: template packs / prompt libraries created by instructors, purchasable by students.
- **Localization**: full Bahasa Malaysia + English i18n (BM-first audience).
- **AI teaching assistant**: RAG over class content, guarded to course scope — "ask about this lesson" widget (carefully scoped; never does the assignment for the student — aligned with the mission of learning fundamentals).

---

## 4. Users & Roles

| Role       | Description                     | Capabilities                                                      |
| ---------- | ------------------------------- | ----------------------------------------------------------------- |
| Visitor    | Anyone landing on the site      | View landing, class info, register/waitlist                       |
| Applicant  | Registered, not yet approved    | See pending status                                                |
| Student    | Approved (later: enrolled) user | Class content, dashboard, submissions, certificates               |
| Graduate   | Completed a class               | Showcase profile, alumni features (P2+)                           |
| Instructor | Content staff (P4)              | Content CRUD, assignment reviews; no user/payment admin           |
| Admin      | Internal operator               | Everything: applications, decisions, cohorts, payments, analytics |

## 5. User Flows (Phase 0)

### 5.1 Registration

1. `/` → pitch + seats-left counter → Register CTA.
2. `/register` → account details + questionnaire → zod validation client + server.
3. Backend checks seat cap atomically → creates `User (PENDING)` + `Application`.
4. Success screen → user can log in and watch status on `/status`.

### 5.2 Admin Review

1. Admin logs into admin app (:4302) → application list + cap meter.
2. Opens detail → questionnaire answers + derived profile chips.
3. Approve / Reject (+ internal note) → status flips → audit-logged.
4. Discord invite sent manually via internal SOP (system does not automate in P0).

### 5.3 Edge Cases

- Cap reached → registration closes with "Cohort full" (waitlist arrives P3).
- Duplicate email → friendly error. Concurrent approvals → race-safe transaction.
- Applicant pre-decision → pending state; rejected → rejected state, no appeal in P0.

## 6. Intake Questionnaire (Phase 0)

Stored as schema-versioned JSON per application.

| #   | Question                                | Type        | Options                                                                                               |
| --- | --------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Q1  | Have you used AI tools before?          | single      | Never / Tried a few times / Use weekly / Use daily                                                    |
| Q2  | Which AI models have you used?          | multi       | ChatGPT (GPT-4/o-series) / Claude / Gemini / DeepSeek / Grok / Llama (local) / Other                  |
| Q3  | What does "vibe coding" mean to you?    | long text   | free form (min 20 chars)                                                                              |
| Q4  | Which vibe-coding tools have you tried? | multi       | Lovable / Bolt.new / Replit Agent / v0 / Cursor / Windsurf / Claude Code / Copilot / Cline / None yet |
| Q5  | Comfort reading code (not writing)?     | single      | Can't read / A little / Comfortable / Comfortable + small edits                                       |
| Q6  | Do you understand what an API is?       | single      | No idea / Heard of it / Basics / Built one                                                            |
| Q7  | Databases (tables/rows)?                | single      | No idea / Heard of it / Basics / Used one                                                             |
| Q8  | Git / GitHub usage?                     | single      | Never / Cloned only / Commit & push / Branches & PRs                                                  |
| Q9  | Deployed anything live?                 | single      | Never / No-code tool / CLI or platform (Vercel/Railway)                                               |
| Q10 | Biggest vibe-coded project so far?      | medium text | free form                                                                                             |
| Q11 | What do you most want to learn?         | multi       | Architecture / Debugging AI code / Databases / APIs / Git & deploy / Prompting / Security             |
| Q12 | Weekly time commitment?                 | single      | <3h / 3–5h / 5–10h / >10h                                                                             |

Required: Q1, Q2, Q4; Q3 min length. Answers visible to admin only; used for pacing + (P4) analytics.

## 7. Technical Design

### 7.1 Monorepo Structure (pnpm workspaces)

```
reka-bytes/
├── docker-compose.yml          # postgres + redis ONLY
├── docs/development/
│   ├── PRD.md
│   └── DESIGN.md
├── packages/
│   ├── frontend/   # Next.js web app            → :4301   (.env.local)
│   ├── backend/    # Hono REST API              → :4300   (.env)
│   ├── admin/      # Next.js admin app          → :4302   (.env.local)
│   ├── db/         # Prisma schema + migrations           (.env)
│   ├── shared/     # zod schemas, types, errors, theme tokens
│   └── e2e/        # Playwright (video + screenshots)     (.env)
└── pnpm-workspace.yaml
```

Each package owns its `.env` (gitignored; `.env.example` committed).

### 7.2 Stack & Versions

| Concern        | Choice                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Runtime        | Node 22, pnpm 11.9.0                                                                                     |
| Frontend/Admin | Next.js 16.2.9, React 19.2.7, TypeScript 5 (strict), Tailwind CSS ^4                                     |
| State          | jotai (only) — server data via typed fetchers into atoms                                                 |
| Animation      | framer-motion                                                                                            |
| 3D/WebGL hero  | OGL or three.js (see DESIGN.md)                                                                          |
| Icons/utils    | lucide-react, clsx, tailwind-merge                                                                       |
| Validation     | zod 4.4.x                                                                                                |
| Backend        | hono @4.12 (@hono/node-server), tsx 4.23, dotenv 17.4                                                    |
| DB             | Prisma 7.9, PostgreSQL 17 (Docker)                                                                       |
| Cache/limits   | Redis 7 (Docker), ioredis 5.11                                                                           |
| Auth           | JWT httpOnly cookies, argon2 hashing, role-guarded routes                                                |
| Payments (P3)  | Stripe + webhooks                                                                                        |
| Email (P3)     | Resend                                                                                                   |
| E2E            | Playwright — `video: 'on'`, `screenshot: 'on'`, `trace: 'retain-on-failure'` → `packages/e2e/artifacts/` |

### 7.3 Docker & Dev Commands

`docker compose up -d` = postgres (5432, healthcheck `pg_isready`) + redis (6379, healthcheck `redis-cli ping`). Apps are never in dev compose.

```
packages/backend   → pnpm dev   (tsx watch, :4300)
packages/frontend  → pnpm dev   (next dev -p 4301)
packages/admin     → pnpm dev   (next dev -p 4302)
```

### 7.4 Error Contract (all phases, all apps)

```ts
// success: { data: T }
// error:   { error: { code, message, details? } }
// codes: VALIDATION_ERROR(422) | UNAUTHORIZED(401) | FORBIDDEN(403)
//      | NOT_FOUND(404) | CONFLICT(409) | RATE_LIMITED(429) | INTERNAL(500)
```

- `packages/shared`: `AppError` factory (`badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `conflict()`), envelope types, `apiFetch<T>()` helper.
- Backend: centralized hono error middleware (zod → 422 field map; unknown → 500 without internals).
- Frontend/admin: one top-level error boundary + toast system fed by the shared mapper. No ad-hoc try/catch formatting.

### 7.5 Data Models (cumulative by phase)

- **P0**: `User` (role, status), `Application` (schemaVersion, answers JSON, decision), `AuditLog`
- **P1**: `Class, Module, Lesson, Quiz, QuizQuestion, QuizAttempt, LessonProgress`
- **P2**: `Assignment, Submission, Review, Certificate, ShowcaseProfile, Notification`
- **P3**: `WaitlistEntry, Cohort, Enrollment, Payment, EmailLog, InviteLink, ReferralCode`
- **P4**: `Post, LiveSession, ModuleFeedback, InstructorProfile`

### 7.6 Always-On Engineering Rules

- REST only; zod-validated on every endpoint; shared schemas from `packages/shared`.
- jotai for all client state; framer-motion for motion; `useEffect` last resort (derived state, event handlers, framework primitives first).
- `strict: true`; ESLint bans `as any` / `no-explicit-any` project-wide.
- Seat-cap / enrollment mutations wrapped in Prisma interactive transactions (race-safe).
- Redis-backed rate limiting on auth + public endpoints.

---

_Maintained in `docs/development/PRD.md`. Update alongside any scope change._
