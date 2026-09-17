---
slug: we-shipped-our-own-journal-then-used-it
title: 'We shipped our own journal, then used it'
excerpt: >
  Our studio has two surfaces: the academy, and the work we do for paying
  clients. This week both shipped off the same tool — a journal written in
  Markdown, stored in the repo, published by commit. Here's why one tool ended
  up serving both.
publishedAt: 2026-09-18
featured: false
tags: [studio, build-in-public, process]
status: published
---

Most "build-in-public" studios treat the journal as a marketing surface — separate
from the product, written last, edited until it sounds like the studio they want
to be. We did the opposite: the journal _is_ the product surface, and the same
tool that publishes our own writing also publishes the writing we do for clients.

We shipped the studio's journal this week. It's a public log at `/journal` —
essays from the founder about the work, with interactive scenes embedded directly
in the posts (drag a thing, watch the layout react). Under the hood, every post
is a Markdown file in the repo, with frontmatter (`title`, `excerpt`,
`publishedAt`, `featured`, `tags`, `coverImage`) and a small block grammar the
renderer understands. Commit the file and it ships on the next deploy. There
is no admin CMS. There is no editor between the writer and the bytes. The
discipline is the discipline of the codebase: the journal lives in git, it
gets reviewed in PRs, and "the post sounds like the studio we want to be" is a
_consequence_ of writing inside the same constraints as the rest of the work.

Then the same week, we shipped a journal for a paying client — a 2.5D browser
game prototype we've been building on the side. They needed a dev diary: how
the prototype came together, what the early alpha taught the team, what's next
on the roadmap. Same tool. Same frontmatter schema. Same Markdown files in
the repo. The "client journal" and the "studio journal" share the same editor,
the same review process, and — critically — the same sensitivity list. What the
studio says publicly about itself has to be answerable by the work in the
repo. What the client says about their game has to be answerable by the build.
The tool enforces that, because the tool is the same.

A few rules we wrote for ourselves, both directions:

- **One idea per post.** If the studio has shipped three things this week,
  that's three posts. If the game studio learned three lessons from alpha,
  that's three posts. Brain dumps are not journals; they're notes that became a
  marketing PDF.
- **Honest about tradeoffs.** The studio's journal has a "what's next"
  section that's a real roadmap — not a sales list. The game's dev diary has
  an "early alpha" section that's the bug list, not a curated testimonial reel.
- **The same review rule.** A junior engineer doesn't merge a feature without
  a PR review; a journal post doesn't ship without someone else reading it.
  We learned the second rule from the first.

The tool also gave us a small but real marketing benefit: the studio's journal
is now the _demo_ of the studio's journal service. A prospective client can read
our writing, click through the embedded interactive scenes, and — without us
pitching anything — understand what a journal-as-tool actually delivers. A
journal that demonstrates the practice beats a journal that talks about the
practice.

If you have a build-in-public story worth telling and the discipline to keep
it honest, the tool is the easy part — and we can hand you the file. The hard
part is writing the same post you'd want to read in six months. That's the
only rule that actually matters.

_Have a project that needs a journal like this?_
[Start a project](/#start) — the free consultation and the mockup are part of
the deal.
