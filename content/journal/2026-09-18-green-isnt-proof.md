---
slug: green-isnt-proof
title: "Green isn't proof — we make an AI watch the tape"
excerpt: >
  Hiring a QA tester was never in the budget for a studio our size, so we
  built our own: tooling that films every UAT run and hands the tape to an
  AI that debugs what it sees — with screenshots as evidence.
publishedAt: 2026-09-18
featured: false
tags: [studio, quality, ai-development]
coverImage: ./cover.svg
status: published
---

A test suite can pass while the app is broken. We learned that the honest
way: a headless probe reported "latch works, unlock works," we pushed the
branch, and a human playtest broke it an hour later with one double-tap the
probe's busy page was too slow to reproduce. That story made it into [the
field report](/journal/seven-days-building-whimsery) as one sentence — _a
probe that has no hands is a probe that confirms, not a probe that judges._

That sentence became a department.

## The part small studios rarely say out loud

We can't afford a QA tester. A good one costs more per month than most MVP
budgets we quote — and UAT is a must anyway, on every web app, every mobile
app, every piece of software with a screen. Something has to stand at the
gate before handover and answer, with evidence, "does this work for the
person who paid for it?"

For years the industry's answer was a checklist: a tester clicks through a
document of steps and initials each row. The checklist has a flaw everyone
has learned to live with — **assertions measure what the code did, not what
the product looked like doing it.** A log can be green while a screen
flickers, an effect freezes instead of fading, or a list renders a beat
behind its own header. Nothing in the report catches it, because nothing in
the report was _watching_.

So we stopped trusting the report alone — and since we couldn't hire the
watcher, we built one.

## Our UAT tester is a tool we wrote

We built our own UAT tester: in-house tooling that drives the app the way a
real user would, films every run, and captures a screenshot at the exact
moment something looks wrong. The tape and the screenshots go to an AI model
— a fast one — that debugs what it sees, not just what the log claims. When
it flags an issue, it doesn't say "looks weird" — it attaches the frame that
proves it. **Show me beats tell me.** A bug report with a screenshot attached
starts the conversation at "fix this," not "is this even real?"

What does "watching" mean? Not reading the log — reading the screen. Did the
page load before the data arrived? Did that toast disappear or is it still
there on the seventh run? Did the form's error state show up for the user,
or only in the log? The AI watches every run, not just the last one, and it
never gets bored on run forty.

Then a human watches what the AI flagged. That order matters. The AI is the
audience; the human is the critic; and the client signs off on footage — not
on a wall of green checkmarks.

## Why this matters if you're a non-technical founder

Traditional UAT puts the burden on _you_. You're handed a staging link, told
to "play around," and quietly blamed later for not poking the one corner
that broke. Our way flips the burden: you review a screening, not a
checklist. The question you're asked isn't "did you test everything?" — it's
"here's the tape, here's what the AI noticed, do you accept?" Acceptance
becomes something you can actually _do_ with eyes, not something you have to
fake with trust.

It also changes what "done" means. Our builds don't go out when the tests
pass; they go out when the tape reads clean — or when the flags that remain
are the ones you looked at and accepted. That's a different kind of
handover, and it's the only kind we're comfortable putting our name on.

We'll be honest about the tradeoff, because the tape would show it anyway:
an AI audience misses things a practiced human eye would catch, which is
exactly why the human pass exists. The AI buys coverage and stamina; the
human buys judgment. Neither is optional.

## Why our way isn't easy to copy

The tools that record a screen are free; the discipline is not. What makes
this work isn't the recording — it's the loop: everything the AI catches
gets written into the codebase as a named rule, so the same mistake never
reaches the tape twice. That loop is tuition from every project we ship,
compressed into standards we hold every build to. We'll gladly tell you the
standard we hold your app to. The setup that enforces it stays ours — the
same reason a restaurant tells you the recipe's standard but not the
kitchen.

_Want your build screened before you sign off on it?_ [Start a
project](/#start) — the free consultation and the mockup are part of the
deal.
