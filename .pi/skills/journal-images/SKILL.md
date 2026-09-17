---
name: journal-images
description: Decide how to source images for a journal post — generate with AI, screenshot the live app, or ask the user to provide. Use when writing a journal post that needs a featured image, cover image, inline diagram, or screenshot, OR when the user says "add an image", "generate a cover", "we need a screenshot for the post". Pair with `journal-write` — this skill is loaded as step 2 of that workflow.
---

# journal-images

## The decision tree

```
Does the image show something real from the running app or service?
├── YES (live UI, real screenshot, terminal output, real metrics)
│   └── ASK THE USER (don't start dev servers — AGENTS.md dev-server rule)
└── NO (diagram, illustration, abstract concept, mock UI, scene/cover)
    ├── Could it be expressed as mermaid / code / table?
    │   ├── YES (flow, architecture, sequence, hierarchy, state machine)
    │   │   └── USE MERMAID (cheaper, semantic, editable, free)
    │   ├── Editorial scene with humans (post covers) → PHOTO COVER (see below)
    │   └── NO (abstract diagram-art, mood shot) → GENERATE illustration
    └── Ambiguous?
        └── ASK the user: illustration or photo cover?
```

## When to ASK THE USER

A screenshot is needed when:

- **Live UI**: the post says "here's what the new admin console looks like"
- **Real terminal output**: actual command output from a real run
- **Real data viz**: a graph from actual metrics, not a mock
- **Anything that requires the dev environment to be up**

**Do NOT start dev servers to capture screenshots** (AGENTS.md dev-server rule).
Tell the user what to capture and how:

- URL to open
- Window/viewport width: **1240px** is the design width
- Light/dark mode: **frontend is light** (Soft Terminal: Paper); **admin is dark**
- What to click / scroll to before screenshotting
- Image format: **PNG** preferred; SVG OK for crispness; **≤ 200 KB**
- Where to drop the file: `content/journal/{slug-folder}/`

Suggested user prompt: "Can you grab a screenshot of [X] at 1240px wide? Drop
the PNG into `content/journal/{slug-folder}/` and tell me the filename — I'll
reference it as `./{filename}.png`."

## When to GENERATE

Use the `generate_image` tool for:

- **Featured/cover images** — stylized, on-brand mood shots
- **Concept illustrations** — anything abstract or metaphorical
- **Mock UI** — when the post shows a mock but doesn't claim it's real
- **Diagrams as art** — when mermaid's utilitarian aesthetic doesn't fit the
  tone

**Tool**: `generate_image(prompt, output_path, [reference_image])`. Default
model is Nano Banana 2 (configurable via `/media-model`).

### Style guidance — Soft Terminal: Paper

The frontend is **light theme** with a "Terminal Editorial" design language.
When generating, include these in the prompt:

- "minimal geometric illustration"
- "soft terminal aesthetic"
- "olive accent on paper background" (hex around `#4E7700`)
- "blueprint grid background, subtle"
- "monospace typography (JetBrains Mono)"
- "generous negative space"
- "no photographic elements, no people, no stock photo vibes"

**Avoid in illustration prompts**: people, faces, laptops, coffee,
"team high-fiving", generic office imagery, neon green, pure white
backgrounds, gradients. (Human scenes are handled by the PHOTO COVER branch
below, not by illustration generation.)

### Output spec

- **Path**: `content/journal/{YYYY-MM-DD}-{slug}/cover.jpg` (featured/cover)
  OR `content/journal/{YYYY-MM-DD}-{slug}/{descriptive-name}.png` (inline)
- **Aspect**: **16:9** (e.g. 1280×720) for covers; flexible for inline
- **Format**: PNG or WebP
- **Size**: ≤ 200 KB; optimize with `pngquant`/`cwebp`/`sips` if needed
- **Alt text**: **required.** Include in the markdown as
  `![Descriptive alt text](./file.png)` — never empty alt for content images.
- **No external URLs**: assets are served via
  `/api/public/journal-assets/{slug-folder}/file.png` only. CDN/external
  hosting is out of scope (PRD-07 §9).

## PHOTO COVERS — editorial human scenes (user-approved 2026-09-17)

Post covers may use **photorealistic human imagery**. The workflow (live on
both seeded posts as of 2026-09-17):

1. **Source**: the founder generates in ChatGPT (or supplies REAL personal
   photos — real beats generated for build-in-public trust whenever
   possible). NOT the `generate_image` tool for human scenes.
2. **Drop zone**: originals go in `content/img/` (gitignored — raw files are
   1.5 MB+). The agent optimizes them into the post folder; the raw drop is
   never committed.
3. **Composition rules (identity safety)**:
   - Faces **turned away, side-profile, over-the-shoulder, or hands only** —
     never a front-facing portrait that could read as a real specific person.
     A build-in-public studio claiming fake people as its team is a
     credibility incident waiting to happen.
   - **No legible text** in the image — image models garble lettering; ask
     for blurred/defocused documents and dark/abstract screens.
   - Keep brand palette through props: olive accents (mug, sticky note,
     chair), warm neutrals, natural window light.
   - Malaysian/Southeast-Asian context reads on-brand (KL skyline, studio
     light) for the academy's actual audience.
4. **Optimize into place** (1280×720-ish, ≤ 200 KB):
   ```bash
   sips --resampleWidth 1280 -s format jpeg -s formatOptions 78 \
     content/img/cover_01 --out content/journal/{folder}/cover.jpg
   ```
   Frontmatter: `coverImage: ./cover.jpg`.
5. **Inspect before accepting**: zoom on hands (extra/merged fingers), eyes
   (dead/uncanny), stray text. Regenerate rather than accept defects.

## When to use MERMAID instead

If the diagram is a **flow, sequence, state machine, hierarchy, or
relationship graph**, use a mermaid code block in the markdown body:

````markdown
```mermaid
graph TD
  A[Visitor] --> B[/academy]
  B --> C[Register]
  C --> D[Pending]
  D --> E[Admin reviews]
  E --> F[Approved]
```
````

Why mermaid beats generated images:

- Renders inline (no extra HTTP request)
- Semantic (screen readers can read it)
- Editable (no regeneration needed when the diagram changes)
- Free (no API cost)

Supported by the existing renderer (`components/student/mermaid-block.tsx`):
`flowchart`/`graph`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`,
`erDiagram`, `gantt`, `pie`. **No HTML labels** in sequence/class diagrams
(PRD-06 §5 rule).

## Image alt text — required for every image

Don't write `![](...)`. Alt text:

- **Featured/cover**: describe the visual + the post topic ("Stylized terminal
  output showing a migration flow, olive accent on paper")
- **Inline diagrams**: describe the structure ("Architecture diagram: browser
  → Next.js proxy → Hono backend → Postgres + Redis")
- **Screenshots**: describe what the user sees and what to notice ("Admin
  leads table with three NEW rows, filter tab active")

## Anti-patterns

- **Screenshot the GitHub repo for "shipping v0.1.0"** → ask the user to do it.
  Repo state matters and the agent can't be sure of timing.
- **Front-facing AI portraits presented as real people/team** → never.
  Identity-safe framing only (see PHOTO COVERS). Real personal photos are
  always preferred over generated humans.
- **Use stock photo URLs from Unsplash/etc** → no external image deps. Local
  only.
- **Generate a "screenshot of the live app"** → if it's mock data, label it
  clearly as a mock. Don't pretend.
- **Reuse a generated image across posts** → each post gets its own assets.
  Brand consistency ≠ asset reuse.
- **Generate text-heavy images** → text in generated images is unreliable.
  Use a real text block in markdown instead.

## Out of scope (defer)

- Animated GIFs / video (defer to a future PRD)
- Image CDN / on-the-fly resize via `sharp` (PRD-07 §9)
- Carousel / multiple featured images per post
- Cover image A/B testing
- Auto-generation of OG image variants for social sharing