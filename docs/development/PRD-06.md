# PRD-06 — AI-Authored Interactive Scenes ("widget" blocks, sandboxed)

> **Prerequisite**: Read `PRD.md`, `LESSON-PLAN.md` §11 (Phase C), `PRD-05.md`, `PRD-03.md`.
> **Status**: Draft v1 — awaiting approval (2026-09-12)
> **Supersedes**: one clause of PRD-05's ground rule. PRD-05 says "BAML never
> generates UI or code"; this PRD carves out **one** sandboxed exception — the
> existing `widget` block type — while PRD-05's six hand-coded interaction
> components remain the _graded_ tier. Scenes are the free-form,
> visual/interactive tier and award no XP in v1.

---

## 1. Overview

**Problem**: AI-generated lessons render as well-typeset articles (typed blocks
→ document flow). For a "learn by doing" product, some concepts are better
taught by **touching a thing**: drag a slider and watch a layout react, toggle
dark mode on a mock UI, type into a fake form and watch validation respond.
Hand-coding every such object (PRD-05's approach) caps how many we can build;
asking the model for **structured data** only fits the six canned shapes.

**This PRD**: let the AI author a **self-contained HTML+CSS+JS document** (a
"scene") during `WriteLesson`, stored as the existing `widget` block, rendered
in a **locked-down sandboxed iframe**. The model authors the _content_ of an
isolated document; it never touches our DOM, our bundle, or our data. This is
the Claude-artifacts / ChatGPT-canvas pattern, applied to lessons.

**Why it's safe to flip the rule now**: the shared block union already reserves
`type: 'widget'` (`packages/shared/src/blocks.ts` — "rendered only via
`<iframe sandbox="allow-scripts">`, never injected into our DOM"), and
LESSON-PLAN §11 Phase C already plans `GenerateWidgetCode` + static checks +
postMessage resize. This PRD is that phase, made concrete.

**What stays true regardless**: `correctIndex`/`explanation` never reach the
client pre-submit (scenes carry no grading); the no-`rehype-raw` rule stands;
quiz/XP systems untouched.

## 2. Current state (verified 2026-09-12)

- AI emits **typed blocks**, not markdown: `WrittenLesson { blocks: LessonBlockRaw[] }`
  with 8 block types; markdown is _derived_ (`flattenBlocksToMarkdown`) and stored
  as `contentMarkdown` fallback. Student viewer renders blocks via `BlockRenderer`;
  legacy lessons render markdown (react-markdown, no `rehype-raw`).
- Admin lesson editor (`content/lesson-editor.tsx`) is **markdown-only** — it edits
  `contentMarkdown` and never touches `blocks`. **Known divergence**: editing an
  AI-generated lesson updates the markdown fallback while students still see the
  original blocks. §7 makes the editor scene-aware; full block editing stays a
  separate PRD.
- `widgetBlockSchema` exists but nothing emits or renders `widget` yet.

## 3. The `widget` block (final shape)

```ts
// packages/shared/src/blocks.ts — extends the existing schema
export const widgetBlockSchema = z.object({
  type: z.literal('widget'),
  title: z.string().min(1).max(200),
  /** Complete self-contained document: inline CSS/JS, no external requests. */
  html: z.string().min(1).max(200_000),
  /** Learner-facing one-liner: what to try. Shown as the scene's intro. */
  brief: z.string().min(1).max(500),
  /** Rendered when the scene can't run (JS off, sandbox error, oversized). */
  fallbackMarkdown: z.string().min(1).max(20_000),
  /** Server-forced false at generation; set true only by admin acknowledge. */
  reviewed: z.boolean().default(false),
});
```

- **One scene per lesson max** (prompt rule; validator drops extras — first wins).
- `contentMarkdown` derivation gains a scene section: `### {title}\n{brief}\n\n
  > _This section is interactive; open the lesson to try it._` — so legacy
  > fallback readers and e-mail-style exports stay coherent.
- No DB migration: `Lesson.blocks` is a versioned JSON column.

## 4. Security model (non-negotiables)

The threat is not the model being malicious — it's a model being _wrong_, an
uploaded PDF poisoning a prompt, or a future prompt-injection vector. Defense is
structural: the scene runs in a **prison we own**, and the content is inert
inside it no matter what it does.

| Layer                             | Control                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolation                         | `<iframe sandbox="allow-scripts">` — **no** `allow-same-origin`. The document runs on an opaque origin: it cannot read `rb_session`, localStorage, the parent DOM, or `document.cookie` (nothing to read — cookies don't apply). No `allow-top-navigation`, no `allow-popups`.                                                                                                                                |
| Network                           | A CSP `<meta>` is **injected server-side into `html`** before storage: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:` → `fetch`/XHR/beacons/nested iframes all fail closed. Scenes must inline everything as data URIs.                                                                                                          |
| Size                              | `html ≤ 200_000` chars (zod) — one scene can't balloon a lesson payload.                                                                                                                                                                                                                                                                                                                                      |
| Static checks (server, hard gate) | Reject (drop block → degrade to prose) if the html contains: `http://` / `https://` resource URLs (allow `data:`), `<form`, `window.top`, `parent.` outside our reporter call, `<iframe`/`<object`/`<embed` inside the scene. Cheap string/regex pass in `toLessonBlocks` scene handling.                                                                                                                     |
| Review gate                       | `reviewed` is server-forced `false` at generation. Admin must open the scene review in the editor and acknowledge before it renders in the student app — **unreviewed scenes render their `fallbackMarkdown`**, with a discreet "interactive section pending review" chip. Acknowledge writes the whole blocks array via the existing `PUT /api/admin/lessons/:id` (blocks round-trip) with `reviewed: true`. |
| PostMessage                       | Child → parent: only `{ source: 'rb-scene', type: 'height', height }` (v1) and later `{ type: 'complete' }`. Parent validates `event.source === iframe.contentWindow` and clamps `height` to `[240, 4000]`. Unknown shapes ignored.                                                                                                                                                                           |

Why not serve scenes from a separate origin/static route instead of `srcdoc`?
`srcdoc` + opaque origin needs zero infra, works offline in dev, keeps the
lesson self-contained in JSON, and the CSP injection point stays server-side.
Revisit only if scenes later need a network allow-list.

## 5. BAML changes (`curriculum.baml`)

- `enum BlockType` gains `WIDGET`.
- `LessonBlockRaw` gains: `title string?` (reuses existing field), `html string?`
  (`@description("WIDGET only: a COMPLETE self-contained HTML document, inline
style/script tags allowed, ZERO external requests — everything inline or
data: URIs")`), `brief string?`, `fallback_markdown string?` — flat class, all
  optional, fields after existing ones (0.226 gotchas).

- Prompt contract (inside the WriteLesson prompt, no `"#` sequences in examples):
  - ≤ 1 widget per lesson; include one only when interaction genuinely teaches
    better than prose (target: interactive lessons stay ≤ 50% of a class).
  - Scene must be **responsive (usable at 375px)**, honor
    `@media (prefers-reduced-motion: reduce)` (pause/stop animations),
    keyboard-reachable controls, visible focus.
  - Self-contained: inline `<style>` + `<script>`, `data:` URIs for images/fonts,
    **no network, no external fonts/CDNs**, no `<form>` submissions.
  - Deterministic layout (no `Math.random` on load), works from a cold cache.
  - **Do not** hand-write the height reporter; the pipeline injects it (below).
  - `fallback_markdown` must fully convey the lesson point in static text — it is
    what screen-reader/no-JS/oversized users get.
- `AI_MOCK` fixture (`mock-output.ts`): lesson 1's scene becomes a small
  deterministic widget (e.g. box-model playground) so e2e never needs the model.
- Regeneration path unchanged (scenes regenerate with the lesson; per-lesson
  regen falls back to existing markdown as today if the job expired).

## 6. Scene post-processing (backend, in `toLessonBlocks` WIDGET case)

Server mutates the model's `html` **once, at generation time**, so the stored
JSON is final:

1. Static checks (§4) — fail → block dropped (existing degrade path).
2. Inject into `<head>` (or prepend if absent): the CSP `<meta>` + our reporter
   `<script>`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:"
/>
<script>
  // reka-bytes scene bridge: height reporting only
  const send = () =>
    parent.postMessage(
      {
        source: 'rb-scene',
        type: 'height',
        height: Math.ceil(document.documentElement.scrollHeight),
      },
      '*',
    );
  addEventListener('load', send);
  new ResizeObserver(send).observe(document.documentElement);
</script>
```

3. Force `reviewed: false`.
4. `flattenBlocksToMarkdown` gains the scene section (§3).

Injection is idempotent (guard on a `data-rb-scene="1"` marker) so regen and
manual re-runs never double-inject.

## 7. Rendering (frontend)

`BlockRenderer` case `widget` → new `components/student/blocks/scene-frame.tsx`:

```tsx
<iframe
  data-testid={`scene-frame-${index}`}
  sandbox="allow-scripts" // opaque origin — the whole point
  srcDoc={injectedHtml}
  title={block.title}
  loading="lazy"
  style={{ height: clampedHeight }} // grows via postMessage, clamped
/>
```

- Height starts at 260, grows to the reported value (clamped 240–4000).
- **Fallback ladder**: `reviewed === false` → `SceneReviewPending` (styled
  placeholder + `fallbackMarkdown` rendered as prose); message errors/timeouts
  (8s) → `fallbackMarkdown`; oversized `html` (> cap, legacy data) → fallback.
- No `Math.random`/determinism concerns in the frame itself — scenes are
  content. `prefers-reduced-motion` is the scene author's duty (prompt) and a
  review checklist item.
- Viewer keeps the existing XSS posture untouched: scenes never enter the
  React tree, `rehype-raw` stays out.

## 8. Admin surface

- **Wizard step 4** (generation progress): unchanged — scenes are part of the
  WriteLesson pass, no new stage wording (stage-tracker unaffected).
- **Lesson editor** (`lesson-editor.tsx`) gains a **Scenes section** below the
  markdown textarea: each scene shows title, brief, size, `reviewed` state, a
  **live sandboxed preview** (same `SceneFrame`), the HTML in a read-only code
  view (R1) with an "Edit HTML" toggle (R2 — textarea + save writes the blocks
  array through `PUT /api/admin/lessons/:id`), and an
  **"I have reviewed this scene"** acknowledge button (sets `reviewed: true`).
- Editing `contentMarkdown` keeps today's behavior for non-scene blocks; the
  editor shows a one-line notice when the lesson has blocks: "Interactive blocks
  render in the student app — markdown below is the fallback" (partial fix for
  the §2 divergence; full block-aware editing = separate PRD).
- Per-lesson regen (`POST /api/admin/ai/regenerate-lesson`) regenerates scenes
  like any other block; `reviewed` resets to false on regen.

## 9. Rings

| Ring            | Deliverable                                                                                                                                                     | Exit                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| R1 — shared     | `widgetBlockSchema` gains `brief`/`fallbackMarkdown`/`reviewed`; `flattenBlocksToMarkdown` scene section; shared unit tests                                     | typecheck + 22+ tests green                                                                              |
| R2 — generation | BAML `WIDGET` + prompt mandates; `toLessonBlocks` widget case + static checks + CSP/reporter injection; `AI_MOCK` fixture scene; cap-200k guard                 | real-AI smoke writes a lesson with a valid scene; invalid scenes degrade to prose, never fail the lesson |
| R3 — student    | `scene-frame.tsx` + `BlockRenderer` case; fallback ladder; reduced-motion note                                                                                  | iframe renders with `sandbox="allow-scripts"`, height syncs, fallback shows for unreviewed               |
| R4 — admin      | Editor scenes section (preview + acknowledge → R2 review gate closed), read-only code view; regen keeps `reviewed` flow                                         | unreviewed scene is visible to admin, hidden from student until acknowledged                             |
| R5 — e2e + docs | e2e-18 (scene render: sandbox attr, height message, fallback path, no-JS), AI_MOCK lesson 1 carries a scene (extends Phase A exit), DESIGN.md §5a scene recipes | suites green via override config                                                                         |

## 10. Testids (frozen)

`scene-frame-<index>` · `scene-title` · `scene-fallback` ·
`scene-review-pending` · `scene-review-ack` · `scene-code-view` ·
`scene-preview` · admin: `lesson-scene-row-<i>`, `scene-acknowledge-<i>`.

## 11. Risks & mitigations

- **Model writes broken JS** → sandbox shows a blank box: mandatory
  `fallbackMarkdown` + review preview in wizard/editor; `withBamlRetry` handles
  schema-level failures; visual blankness is caught by admin review (gate).
- **Payload growth** → 200k cap + 1/lesson + `loading="lazy"`; watch lesson DTO
  size in analytics after R2.
- **CPU abuse via animation loops** → scenes are bounded-size, non-networked;
  CSP kills mining-style fetch beacons; review gate + regenerate as the lever.
- **Screen readers** → scenes are opaque documents; `fallbackMarkdown` is the
  accessible path (mandated, rendered for unreviewed/failed states).
- **Scope creep** → no XP, no grading, no completion signals in v1; the
  postMessage protocol leaves room (`type: 'complete'`) for a later PRD-05-style
  XP hook without re-architecture.

## 12. Explicitly out of scope (this cycle)

Full block-aware lesson editing (drag/reorder/edit callouts in admin), XP for
scene completion, scenes on quizzes, cross-lesson scene libraries, `allow-forms`
scenes, serving scenes from a separate origin, stepper lesson-flow (candidate
PRD-07).
