---
name: journal-write
description: Write a marketing-facing journal post for the public studio journal at `/journal`. Use when the user says "write a journal post", "draft a blog post", "post about [topic]", "journalize [thing we shipped]", "I want to publish on the journal", or similar. Load BEFORE drafting — never write the post without first loading `journal-sensitivity` to check the topic. NOT for developer-facing docs (those live in `docs/development/`), internal notes, changelogs, or release notes.
---

# journal-write

## What this skill produces

A new file under `content/journal/YYYY-MM-DD-{slug}.md` matching the canonical
PRD-07 format:

- **Filename**: `YYYY-MM-DD-{slug}.md` (slug = kebab-case, no date inside)
- **Frontmatter** (frozen schema, full spec in PRD-07 §3.1): `slug`, `title`, `excerpt`, `publishedAt`, `featured`, `tags`, `coverImage?`, `status`
- **Body**: marketing-grade markdown. **No source code blocks.** Screenshots or
  generated diagrams only (load `journal-images` for the decision). Embedded
  interactive widgets use the ` ```widget ` fence (PRD-07 §4.1) — only when
  genuinely interactive, not for decoration.

This skill is **workflow + voice**. The canonical schema is in PRD-07 §3.1 —
read it before writing. Don't duplicate the schema here.

## Workflow

Follow this order. **Never skip steps 1–3.**

### 1. Sensitivity check (load `journal-sensitivity`)

Before asking anything else, load `journal-sensitivity` and read it. If the
topic is in the NEVER list, stop and tell the user. Examples of stop-conditions:

- "Write a post about our backend API endpoints"
- "Post about the BAML prompts we use"
- "Explain how our admin auth cookie works"
- "Write about the rate-limit codes"

If the topic is fine but specific sentences are borderline, ask the user
about those sentences one at a time as they come up.

### 2. Image strategy decision (load `journal-images`)

Load `journal-images` and decide upfront, before drafting:

- Featured/cover image → generate, ask user to provide, or skip
- Inline diagrams → prefer mermaid over generated images
- Terminal/CLI output → code block with syntax highlighting, never a screenshot

If the user already provided an image, skip the decision and reference it.

### 3. Ask the user 4–6 questions

Do NOT start writing until the user has answered. The questions:

1. **Topic + angle**: What's the story? ("we shipped v0.1.0 and learned X" is
   an angle; "v0.1.0 release notes" is a list, not a story). If the user gave
   a topic, restate it as an angle and confirm.
2. **Audience**: founder reading it? Technical peer? Prospective client?
   Recruiter? Default: **prospective client who's a non-technical founder**.
3. **Length**: short (300–500 words) / medium (600–900) / long (1000–1500)?
   Default: medium.
4. **Featured?**: should this post be the featured one on `/`? Default: **no**.
   Only feature the strongest post — featuring every post dilutes the slot.
5. **Tags**: 2–4 tags, lower-case kebab-case. Suggest based on the topic; user
   confirms.
6. **CTA at the end**: link to a sibling post? To `/academy`? To `/#start`
   (lead form)? To a class? Default: **one soft CTA**, no hard sell.

### 4. Outline → confirm → write

After the user answers, draft a one-paragraph outline + headline + suggested
slug. Show the user. Wait for the green light. Then write the file.

### 5. Write the file

Use the `write` tool. The path is:

```
content/journal/{YYYY-MM-DD}-{slug}.md
```

The slug in frontmatter MUST match the filename slug. If they diverge, the
backend excludes the post (PRD-07 §3.1).

If the post needs images, the asset folder is co-located:

```
content/journal/{YYYY-MM-DD}-{slug}/
  cover.png
  inline-diagram.png
  widgets/
    foo.html      (only for Phase 2 widget posts)
```

### 6. Verify

After writing, report to the user:

- Filename and full path
- Frontmatter summary (title, tags, featured y/n, status)
- Word count
- Whether a featured image was generated, waiting on the user, or skipped
- Anything you redacted from the draft and why (link back to
  `journal-sensitivity` rules)

## Voice & tone

- **Founder voice**, not corporate. First person plural ("we"), contractions,
  direct.
- **Marketing-grade means legible**, not glossy. No "delve", no "leverage", no
  "in today's fast-paced world". Short sentences. Specific numbers beat vague
  claims ("we shipped 6 features in 2 weeks" beats "we shipped fast").
- **One idea per post.** Not a brain dump. If the user wants to cover 4 topics,
  suggest 4 posts.
- **Show the work**: include concrete examples, screenshots, before/after.
  Posts that show effort outperform posts that describe it.
- **End on action, not summary.** Don't recap at the end. End on a forward
  motion (CTA, question, what's next).
- **Honest about tradeoffs.** "We chose X and it cost us Y" is the
  differentiator. Posts that admit friction build more trust than posts that
  pretend everything was smooth.

## Anti-patterns (push back if the user asks for these)

- "Make it sound more professional" → push back. The brand voice IS the
  founder voice. Professionalism is execution, not vocabulary.
- "Add more buzzwords" → refuse. Rewrite without them.
- "Don't mention any failures or tradeoffs" → refuse. Tradeoffs are content.
- "Just write the release notes" → that's a changelog, not a journal post.
  Link to the changelog or expand into a story instead.
- "Include the exact code" → refuse. No source code in journal posts. Refer to
  the repo, the docs, or external links.
- "Make it longer" → suggest splitting into a series instead.
- "Add a call-to-action for [X] in every post" → one soft CTA per post. More
  reads as desperate.

## Out of scope

- Anything in `journal-sensitivity`'s NEVER list
- Source code (use `docs/`, README, or external links)
- Internal infrastructure details (BACKEND_URL, GHCR, Coolify specifics)
- Pricing specifics beyond what's on the public `/` page
- Unreleased features (only ship what's on a git tag reachable from `main`)
- Marketing copy without substance
- Multi-post threading, series landing pages, RSS — defer until readership
  signals exist