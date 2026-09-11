# PRD-03 — Progress Automation + Admin Console + Lesson Polish

> **Prerequisite**: Read `PRD.md`, `PRD-02.md`, and `DESIGN.md` first. This document plans the next work cycle: auto-completing lessons from inline-check telemetry, a proper admin console (sidebar, students, analytics, delete), and frontend-only lesson visual polish.
>
> **Status**: Plan v1 (approved direction, not yet implemented)
> **Ground rule**: Anything that requires a BAML change is **deferred** (see §6).

---

## 1. Overview

Three workstreams, deliberately ordered by user value:

1. **Auto-complete** — lessons complete themselves when the student has engaged with every knowledge check. Kills the "did the lesson but progress says 0/3" confusion.
2. **Admin console** — a real sidebar shell plus three missing surfaces: delete-lesson UI (API already exists), a Students directory with per-student progress, and an Analytics page that turns `BlockEvent` + `QuizAttempt` telemetry into teaching signals.
3. **Lesson polish** — frontend-only visual refinement of the lesson viewer. No schema, no BAML.

**Non-goals for this cycle**: new block types, BAML prompt changes, drip release, quiz gating (still deferred per PRD-02 §14).

---

## 2. Phase A — Auto-complete lessons

### 2.1 Rule

> A lesson auto-completes the moment the student has **attempted every inline-check in it** — right or wrong.

Rationale: checks are formative; attempting is the engagement signal. Requiring all-correct would let one confusing question block progress forever.

### 2.2 Behavior matrix

| Case                                                          | Behavior                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lesson with N ≥ 1 inline-checks, student attempts all N       | Auto-complete (`LessonProgress.upsert`)                                           |
| Student answers some wrong                                    | Still completes (can retry checks; stays complete)                                |
| Student attempts only k < N checks                            | Not complete                                                                      |
| Lesson with zero inline-checks (legacy prose / video lessons) | Manual "mark as complete" button remains the only path                            |
| Manual button on a check-lesson                               | Still works (fallback / skip)                                                     |
| Synthetic env-admin                                           | Silent no-op (no User row → no progress writes; see PRD-03-ADDENDUM on env-admin) |

### 2.3 Changes

| Layer                      | Change                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `learn.service.ts` | `checkInlineAnswer`: after the BlockEvent write, count distinct inline-check block indexes this user has attempted (query `BlockEvent` by lessonId+userId, distinct `payload->>'blockIndex'`) vs total inline-check blocks in the lesson. If equal → `lessonProgress.upsert`. Add `lessonCompleted: boolean` (+ `completedAt?`) to `InlineCheckResultDTO` |
| Shared                     | Extend check-result DTO with `lessonCompleted`                                                                                                                                                                                                                                                                                                            |
| Frontend                   | `InlineCheckBlock` receives an `onCompleted?` callback (or the result object); `lesson-viewer` flips the button to "completed ✓" state without reload                                                                                                                                                                                                     |
| E2E                        | Extend `e2e-14-live-vibe6.spec.ts`: answer ALL checks in lesson 1 → assert button flipped + module map 1/3 **without ever clicking mark-complete**                                                                                                                                                                                                        |

### 2.4 Performance note

The "distinct attempted indexes" query runs per check submit. With the `BlockEvent @@index([lessonId, userId])` index this is a cheap indexed scan; no caching needed at current scale. Revisit only if lessons grow 50+ checks.

---

## 3. Phase B — Admin console

### 3.0 Current state (recon)

- Admin has **no persistent navigation** — `/applications`, `/content`, `/ai-masterclass` are island pages.
- `DELETE /api/admin/lessons/:id` **already exists** (content.routes.ts) — only UI is missing.
- Cascades are correct: deleting a lesson removes its `LessonProgress` + `BlockEvent` rows (onDelete: Cascade); quizzes are module-level and survive.

### 3.1 Sidebar shell (B1)

- Layout-level sidebar on ≥md, collapsible top-bar drawer on <md (mirror the student shell pattern).
- Terminal Editorial styling: mono uppercase labels, accent active-state rail.
- Items: **Dashboard** (`/`) · **Applications** (`/applications`) · **Content** (`/content`) · **Students** (`/students`, new) · **Analytics** (`/analytics`, new) · **AI Masterclass** (`/ai-masterclass`).

### 3.2 Delete lesson UI (B2)

- Per-lesson delete button in the `/content/class/[id]` tree editor.
- Confirm dialog stating scope: _"Deletes the lesson and all student progress + check events for it. Quizzes are not affected."_
- Hard delete via the existing endpoint (classes are AI-regenerable; no soft-delete needed — decision recorded below).
- Guard: disable while an edit form for that lesson is dirty.

### 3.3 Students page (B3)

| Endpoint                                 | Returns                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/students?query=&status=` | Paginated list: id, name, email, status, role, joinedAt, lessonsCompleted/lessonsTotal, quizAttempts, avgQuizScore, lastActivityAt |
| `GET /api/admin/students/:id`            | Detail: per-class progress map, quiz attempt history (score, passed, date), recent inline-check answers (last 20)                  |

- UI: searchable, status-filterable table; row click → detail view (drawer or sub-page) with per-class progress bars and attempt history.
- Read-only in v1: approve/reject stays in Applications (single source of decision flow). Revisit if admin asks for inline status changes.
- Identifiable by design — this is the founder's own cohort tool, not public analytics (decision recorded below).

### 3.4 Analytics page (B4) — "topics, tasks, quiz marks"

| Endpoint                             | Returns                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/analytics/classes`   | Per published class: enrolled-ish proxy (students with any progress), completion %, quiz pass rate                                           |
| `GET /api/admin/analytics/class/:id` | Per lesson: completion count; **per inline-check block**: attempts, % correct (the concept-difficulty heatmap); per quiz question: % correct |

- UI v1: class picker → two panels: (1) lesson completion bars, (2) **inline-check heatmap** — each check rendered as a cell colored by % correct (green ≥ 80, amber 50–79, red < 50). Low % = concept teaches badly = content signal for the founder.
- Quiz question stats in the same panel (per question % correct) to spot broken/ambiguous questions.
- Aggregation queries live in a new `analytics.service.ts` using SQL group-bys over `BlockEvent.payload->>'blockIndex'` + `QuizAttempt`; keep them as raw Prisma/SQL aggregates, no ORM gymnastics.

### 3.5 Env-admin hardening (small, rides along)

Discovered during live testing: the synthetic env-admin (no DB row) can browse lessons but **every progress write FK-fails** — loudly on mark-complete, _silently_ on BlockEvent (fire-and-forget swallow). Fixes:

1. `BlockEvent` fire-and-forget catch logs `console.warn` instead of pure silence.
2. Student-write endpoints (`complete`, `check`) return a clean 403 `"student account required"` for synthetic admin instead of a 500.
   (Alternative considered and rejected for now: materializing a DB row for env-admin — muddies the Users directory with a fake student.)

---

## 4. Phase C — Lesson visual polish (frontend-only)

Scope guard: **no schema changes, no BAML changes, no new block types.** Pure CSS/layout in `BlockRenderer` + `lesson-viewer`.

| Area         | Change                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography   | Tighter heading scale inside blocks; prose `max-w` measure (~68ch); line-height bump on long paragraphs                                                 |
| Blocks       | Softer card borders + subtle shadow on `key-terms`/`comparison`; accent left-rail on `callout`; numbered rail on `steps`                                |
| Inline-check | Animated reveal of the explanation (fade/slide, `MotionConfig reducedMotion` aware); stronger correct (green fill) / incorrect (red fill) option states |
| Reading flow | Sticky mini-header on scroll: lesson title + completion dot + jump-to-quiz link                                                                         |
| Bottom nav   | Keep; add lesson title tooltip on hover                                                                                                                 |

Deferred to Phase B/C (needs BAML): figure/image blocks, pull-quotes, model-directed emphasis, simulation shells.

---

## 5. Execution order & estimates

| #   | Workstream                | Effort       | Depends on                        |
| --- | ------------------------- | ------------ | --------------------------------- |
| 1   | Phase A — auto-complete   | ~½ session   | —                                 |
| 2   | B1 sidebar + B2 delete UI | ~½ session   | —                                 |
| 3   | Phase C — lesson polish   | ~½–1 session | —                                 |
| 4   | B3 students page          | ~1 session   | B1                                |
| 5   | B4 analytics page         | ~1 session   | B1 (data accrues in the meantime) |
| 6   | §3.5 env-admin hardening  | trivial      | ride along with #1                |

E2E: extend e2e-14 (auto-complete), new e2e-15 (admin students/analytics smoke), keep e2e-09 green throughout.

---

## 6. Deferred (requires BAML — do NOT pull into this cycle)

- New block types: figure/image, pull-quote, multi-column, interactive widget shells (Phase B/C per LESSON-PLAN §11)
- Model-directed layout hints (e.g., `emphasis` block, "story mode" sequencing)
- Any prompt/pipeline changes

---

## 7. Decisions recorded

| Decision                                       | Rationale                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auto-complete = all-attempted, not all-correct | Formative checks measure engagement; all-correct lets one bad question block progress  |
| Hard delete for lessons                        | Content is AI-regenerable; soft-delete adds schema + UI complexity for no current need |
| Students page read-only v1                     | Applications page remains the single approval flow; avoids duplicate decision paths    |
| Identifiable (non-anonymized) analytics        | Internal founder tool for their own cohort; privacy posture unchanged                  |
| Env-admin: 403 on student writes, not DB row   | Keeps Users directory clean; synthetic identity stays synthetic                        |
| Lesson polish = CSS only                       | BAML/prompt changes explicitly deferred by product decision (founder)                  |
