# State — 2026-09-18 (Whimsery posts merged into one field-report post)

## Current state
- **2026-09-18 (latest): journal list sorted pure latest-first** — `sortPosts` dropped the featured-first pinning in `journal.service.ts` (user call: "sort by latest"). Featured card keeps hero styling inline at its date position; `/` featured slot (`getFeaturedPost`) unaffected. Order now: green-isnt-proof → seven-days → we-shipped → free-prd(featured) → your-app-idea. Backend typecheck/lint ✅. e2e-19 assertions still hold (featured-card testid + visibility only, no order assertions). NOT committed yet.
- **2026-09-18 (later): NEW POST `green-isnt-proof` written** — user-approved draft → file. Marketing piece on the studio's UAT practice (NOT Whimsery-specific): couldn't afford a QA tester → built own UAT tooling (AI films every run, debugs with screenshot evidence). Model name HIDDEN per user call ("a fast AI model" — glm-5.3-flash stays private). Featured: no. Tags studio/quality/ai-development. Cover = hand-authored SVG (image API 402 again — credits still out) in `2026-09-18-green-isnt-proof/cover.svg`, verified via Chrome-for-Testing headless render (chromium-1234 binary works for SVG inspection). Probe: parses, 4 min read, no leaks, no code fences, admin rows 6 no warnings. NOT committed yet — user's call.
- **2026-09-18: SIX WHIMSERY GAME POSTS MERGED into ONE** — user asked ("too many whimsery journal"). Deleted 6 untracked posts + folders (`eight-bugs`, `five-lessons`, `cathedral`, `button`, `no-account`, `server-events`), created `2026-09-18-seven-days-building-whimsery.md` — "Seven days building Whimsery — the field report".
  - Sections in player order: splash/cathedral → login wall → AUTO button → combat juice → five sprint rules → eight-bugs table. Cross-duplicated lessons deduped (materials/update-loop/anti-enumeration/first-sighting each appear once, cross-referenced). ONE CTA at the end (was 6 identical).
  - Images: all 6 original covers reused as inline section images in `2026-09-18-seven-days-building-whimsery/` (`login-wall.jpg`, `auto-button.jpg`, `combat-juice.jpg`, `two-wizards.jpg`, `first-quest.jpg`) + cathedral recompressed q55 → `cover.jpg` 155 KB. Real screenshots, no new generation needed.
  - Game is named **Whimsery** (Fields of Prontera / HIGH WIZARD) — visible on covers; user's own word.
- **Verification**: shared tests 41/41 ✅ · `format:check` ✅ (also reformatted `we-shipped-our-own-journal-then-used-it.md` — was unformatted) · tsx service probe ✅ (list total 4, merged post parses, read 14 min, all 6 asset paths rewritten to `/api/public/journal-assets/2026-09-18-seven-days-building-whimsery/…`, old slugs 404, traversal blocked, admin rows 5 warnings none).
- Published journal is now 4 posts: free-prd (featured), seven-days-building-whimsery, we-shipped-our-own-journal, your-app-idea (+1 draft behind-the-classroom-engine). e2e-19/20/21 frozen slugs untouched.

## Next steps
1. User's call: commit + push `green-isnt-proof` (written this session, uncommitted).
2. Live-server smoke + e2e-19/20/21 runs (still pending from 2026-09-16, user's call).
3. Tag v0.1.6 → GHCR images with journal content.
4. Phase B (simulation template library, LESSON-PLAN §11) + real-AI WriteLesson smoke — queued.
5. Main-page content backlog (portfolio/showcase, FAQ, WhatsApp CTA) — unchanged.

## Blocked / waiting on
User call: green-isnt-proof commit, e2e runs, deploy tag.
