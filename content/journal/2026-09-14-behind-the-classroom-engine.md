---
slug: behind-the-classroom-engine
title: Behind the classroom engine
excerpt: >
  A look under the hood at how lessons are built for the academy — DRAFT,
  not ready, do not publish.
publishedAt: 2026-09-14
featured: false
tags: [product, teaching]
status: draft
---

Draft — internal structure notes only, all specifics to be generalized for a
public version before it can ever ship.

When we design a lesson we don't write an article. We write a sequence of
teaching moves: motivation first, then the concept in plain language with every
term defined at first use, then a worked example, then the mistakes we know
beginners make, then a check that proves the idea landed, then a recap. The
platform renders those moves as typed blocks, which is what lets the same
lesson render as text, as diagrams, and as interactive scenes.

(To be written: what "proves the idea landed" means — checking comprehension
without spoiling the answer, and why that has to happen away from the client.)

(To be written: the AI pipeline that drafts lessons from source material, the
outline checkpoint, and why a human approves the outline before anything is
generated. Generalize — no prompts, no model specifics.)
