---
slug: seven-days-building-whimsery
title: 'Seven days building Whimsery — the field report'
excerpt: >
  One client game, seven days. The splash, the login wall, the button we
  deleted, combat juice on the network, and the eight bugs that almost
  shipped — everything the sprint taught us, in one place.
publishedAt: 2026-09-18
featured: false
tags: [studio, engineering, design, ai-development]
coverImage: ./cover.jpg
status: published
---

We shipped a small multiplayer browser game — Whimsery, Fields of Prontera —
in seven days. While building it we published an essay every time we hit a
wall, and after six of them the journal read like a scattered diary. This is
the field report: one post, the whole sprint, in the order a player meets it —
splash, gate, first fight — and then the engineering underneath.

## Start with the splash

The first thing we got right was the first thing the user sees. We didn't
start with the game — we started with the splash, and the splash is the image
at the top of this post: a moonlit gothic cathedral with two violet banners,
a city suspended over waterfalls under a giant moon. That's already a story —
something ancient, something you approach, something on the other side of
that gate.

A glassmorphism card on a generic gradient reads "modern" — but for a game
whose audience grew up on isometric painted towns and ornate parchment menus,
that's a category error. The login wall has to feel like a cathedral gate,
not a SaaS dashboard.

Do we ship a stock photo, or do we generate one? We generated one:

- **A generated background unifies the tone.** If the menu looks like the
  genre but the splash looks like a fintech app, players feel the dissonance
  before they read a word. The cathedral cost one afternoon of iteration and
  set the visual north-star for every panel after it.
- **No licensing surface.** No expiry, no attribution page, no "this stock
  photo was sunset by its photographer" surprise a year after shipping.

The rules we keep writing for every visual front-door since:

- **One accent color, used sparingly.** Gold carried the chrome and the focus
  glow; everything else was paper-and-ink. Two accents fight; one accent is
  identity.
- **Frame, don't fill.** Corner brackets and a thin gold rule read as "gate."
  Filled panels read as "form." A gate invites; a form is processed.
- **Title as crest, not as text.** The brand name is set in serif, scaled to
  one line, allowed to glow slightly on focus — the only thing on the page
  allowed to be loud.
- **The card is part of the image, not above it.** Eye-toggle, focus rings,
  and error states stay quiet because the picture is the show.

These rules aren't specific to games. Any product whose first surface is a
sign-in screen lives by them: the splash is the product for the first eight
seconds, and nothing on the page should compete with it.

## No account, no play — the wall

A wall feels different from a modal. A modal asks "are you done with what
you're doing?" A wall asks "do you have what you need to come through?" The
old login was a card floating above a generic background — the kind of "sign
up to continue" modal nobody reads. The new one embeds the card _inside_ the
splash, so the cathedral becomes the room the card sits in: gold hairline,
four corner brackets, a serif brand column reading "HIGH WIZARD", a segmented
tab control for Log In and Create Account, one CTA with a shine on hover —
focus rings and entrance staggers kept quiet.

![The Whimsery login wall: the adventurer sign-in card embedded inside the splash, gold hairline and corner brackets on violet.](./login-wall.jpg)
_The card sits inside the cathedral, not above it. The brand column is the only loud thing on the page._

The rules that made the wall work:

- **The wall is part of the session.** Signed in → the wall collapses and you
  join the world. Sign out → reload, the wall is back. A signed-in reload
  auto-begins; no second login. The first click after the URL is the gameplay
  click, because the splash already chose for you.
- **A diagnostic escape, opt-in and out of sight.** A signed-in player can
  land in the local sim without a server round-trip — useful for repro work
  and "let me see the animation alone." Surfaced only in the boot log, never
  in UI copy.

A wall that feels like a wall needs two honest things behind it: a session
control you actually understand, and a password reset you could demo to a
room of strangers without flinching.

### "Remember me" should mean something

The first cut had a checkbox labeled "Remember me" that either set a
seven-day cookie lifetime or a browser-session cookie — logic nobody could
see, so nobody clicked it. Fix: the label became "Remember adventurer," the
checkbox drives a visible subtitle ("Your session will last 7 days." / "Your
session ends when you close the tab."), and the cookie matches. **A control
whose effect the user can't see is a control the user will ignore.**

### Password reset, without the infrastructure

Most "we forgot your password" flows depend on SMTP. We don't run SMTP in
non-prod, and we don't want to be one config away from leaking a dev reset
token into a real inbox in prod. Instead:

- The reset mints a short-lived, one-time-use token bound to the email —
  one issue, one use, burned after that.
- The response is the same shape for unknown emails and known emails —
  same body, same timing, every time. **Anti-enumeration is a one-liner:**
  a reset flow that says "no such email" hands attackers an account list.
- In non-prod the response carries a dev token the UI autofills, so the
  full flow can be demoed without an inbox. In prod it's absent — the
  autofill only fires when the field is present, which it isn't.

The reset UI is two stages — request (email only) → confirm (token + new
password) — with a back link between them, same ornate chrome. No "your
account has been locked" theatrics. The flow is the flow; the chrome is the
chrome.

## The button we deleted

An AUTO button fought the player. The button said: hold me down, the
character attacks. The player held. The player let go. The character
stopped — and the player felt like the character had _decided_ to stop.
Worse: pressing AUTO again resumed the attack mid-swing, halfway between a
held action and a tapped action. Modes lived in widgets, and the widget
couldn't tell the modes apart.

![The AUTO toggle button zoomed against the Whimsery field — the control we deleted.](./auto-button.jpg)
_The AUTO button: a commitment contract the player didn't sign._

The fix wasn't a better button. The fix was no button. The mode moved into
the player's behavior:

- Hold the attack key for at least two seconds → the mode latches ON.
- Releasing the key after that does **not** disarm the mode.
- Double-tap to turn it OFF — but only at least three seconds after the mode
  armed. The lockout is what makes an accidental release safe: you can't
  disarm by accident, only by intent.

**Modes live in behavior, not in buttons.** A button is a thing you click; a
mode is a thing you are _in_. When a mode is held by a button, the button
becomes a commitment contract the player didn't sign. When the mode lives in
time and gesture, the player did sign, and the contract is honest.

### The probe that lied (kind of)

The first headless run of the new behavior reported "latch works, unlock
works." We pushed. The first human playtest confirmed both. Then a second
playtest got a double-tap that wouldn't unlock — the keypresses were just
over 400 ms apart, and the unlock window is 400 ms.

The headless probe had been wrong, but it had also been right _about what it
could read_: the busy probe page spaced the headless taps more than 400 ms
apart, so the double-tap never fired under test. The probe told the truth it
could read; it had no hands. The lockout window exists because a probe can't
press with the keyboard the user actually uses.

> **A probe that has no hands is a probe that confirms, not a probe that
> judges.** The real-browser confirm is the final word.

## Combat juice over the network

For the first two months, combat felt perfect offline and empty online.
Bolts still drew — they were always the browser's job — but the player saw
only their own effects, and the remote wizards felt like NPCs with a chat
channel. The reason was structural: server events had **state**, not
**feelings**.

![Remote wizards trading damage in Whimsery — burst effects, damage numbers, and the Porings taking the hits.](./combat-juice.jpg)
_What the renderer was missing: where the bolt left from, how fast it flies, and that the other wizard just flinched._

A damage event used to say "this target took this much" — nothing about
where the bolt started, how fast it should fly, or that the wizard on the
other side of the map had just flinched. We fixed it by widening the
protocol — carefully, never by making the server render anything:

- **Events carry feelings, not just truth.** The skill-cast event now
  carries a payload the renderer already understands from the offline code
  path — speed, color, scale. The same numbers, on the wire.
- **Every hit has an origin.** The damage event carries the source
  position, so the client can draw the trail back to the caster.
- **The server's own blind spot.** Mob attacks on players finally emit the
  same event everything else does — previously those hits happened on the
  server with no way to tell the renderer they happened.

### Cooldowns are server-of-record, client-renders

A cast event sets the cooldown on the local UI _because the server said the
spell fired_. With 200 ms of jitter, the cooldown is still honest: a second
player who lands the same spell a frame later sees the same cooldown tick.
The cooldown is not a UI lie.

### Materials are private to the remote

Each remote wizard clones its own flashable material — never the shared one,
so a remote taking damage cannot flash the local player. Geometry is shared
and never disposed by remotes; materials are not. **When you clone a
renderable, audit which sub-objects are stateful — animation clips,
materials, particle emitters — and give every clone its own.** The same
lesson holds in any framework.

### The rule on the whiteboard

> **Server events carry feelings, not just state.** If the renderer needs
> the data to _feel_ correct, that data is part of the protocol. Anything
> else is a UI lie.

The split between "state the server owns" and "feelings the client paints"
applies to any multiplayer system — chat presence, cursor positions,
notification toasts. It's the design decision that makes the system feel
honest or feel laggy.

## Five rules the sprint wrote

Seven days forces honesty — there's no time to hide behind architecture
diagrams. Five rules survived the sprint, in the order they hurt the most.

![Two wizards meeting in the Whimsery fields — the moment the multiplayer mirror had to render a stranger as a real character.](./two-wizards.jpg)
_Remotes need to render as real characters, not capsules — which is where rules 4 and 5 came from._

**1. Free-orbit cameras need screen-space → world rotation, not
assumptions.** The first instinct is "WASD = world axes," but a free-orbit
camera rotates the frame, not the world — so screen-up is whatever the
camera's yaw says it is. The fix is one rule written once in the player's
update: rotate the input vector by the camera's yaw before applying it.
After that, every input source — keyboard, joystick, touch — just works.

**2. The network layer is a mirror, not a rewrite target.** The temptation
when going multiplayer is "rewrite the sim to talk to the server." Don't.
Server events are _events_, not state; the simulation stays single-player,
and the network layer is a side-by-side mirror that drops into the same
update hooks. Combat ghosts, hit-reactions, cooldown mirrors — all
render-only. Any system with a server-of-record generalizes the same way.

**3. Image-to-3D gives you geometry, not animation.** The generators produce
beautiful meshes; they do not animate. Our hero arrived as a single file,
got split by a small tool, and is driven by a custom animator — idle bob,
walk stride, cast pose, hurt flinch, death collapse — purely from code. The
trap: the default optimizer preset merges independently-animated parts back
into one, which makes the staff animate as part of the hat. If you generate
an asset and animate it programmatically, disable the merge-by-default flag.
Always.

**4. Clone rigs by bone name, not by object reference.** Remotes are
deep-cloned and re-rigged by bone name — head, armR, staffTip — not by
reference. Which sub-objects are stateful gets audited per clone, as [the
combat section above](#combat-juice-over-the-network) shows with materials.

**5. Predicted-position drift is cheaper than fixing the model.** The own
player reconciles with an exponential lerp toward the server position —
smooth, free per frame, and it survives 100 ms of jitter without
rubber-banding. The trap is _what counts as a small delta_: moving a few
units per tick is movement; dozens is a teleport. **First-sighting of an
entity is always a teleport** — lerping from the origin to a far corner of
the map is what drags the camera across the world on every refresh. Hard-snap
first sightings, and let the smoothness live in every frame after the first.

## Eight bugs that almost shipped

The first 48 hours of "it works in my browser, broken in yours" taught us
more than the 48 hours before. These are the bugs that actually shipped to
production, and the rule each one wrote into the codebase.

![A lone high wizard on the Whimsery field, mid-quest — the state the game was in while the bug list below was live in production.](./first-quest.jpg)
_The bug list below was written against this exact build._

| Bug                                                                               | Root cause                                                                                                                                                                                                                                                 | Lesson                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bolts froze on a target's face at close range, doing zero damage                  | The homing step landed the projectile _exactly_ on any target closer than its speed-per-tick distance. The hit-test then ran with a zero distance, which got coerced to 1 by an `\|\| 1` fallback, and the radius check failed. Closer = guaranteed stall. | Hit-check the **true** distance before moving. Don't let the move step destroy the geometry you need to test.                                                                                              |
| Auto-target fought manual clicks — clicking a different mob got hijacked          | The network pilot overwrote the attack target with the nearest mob every 300 ms and re-sent the attack order for it, yanking the server sticky back.                                                                                                       | The **manual order beats the auto-pilot**. The pilot uses the sticky target while it lives; nearest is only the fallback. Heartbeat the order so a lost order self-heals.                                  |
| The local plate said one name, the top-right said another                         | The character was constructed with a build-time constant and never learned the account name, which lived only in the auth UI. The server had the right name on the snapshot; the client never applied it.                                                  | **Welcome carries identity.** Every join applies the name and progress from the server's canonical save. Browser state never wins.                                                                         |
| A ghost nameplate stayed after logout — the name remained, the character was gone | The plate had a register function but no unregister. A leaving remote's plate lived forever at its last projected spot because its cached matrix still computed a world position.                                                                          | Register _and_ unregister. The lifecycle of the plate is the lifecycle of the body. Never extend one without the other.                                                                                    |
| Refresh always respawned at the default position                                  | Movement never dirtied the save. The dirty flag was only set on level/XP events, and the disconnect-flush early-returned when clean — so the position was never written.                                                                                   | **The "dirty" gate is a design decision.** Either widen it (every position change is a change) or remove it entirely. We widened: mark-dirty on every move intent, force-flush on disconnect and shutdown. |
| Combat effects and damage numbers never dissolved                                 | A refactor moved the update loop. The move silently dropped two update calls. Effects spawned but never faded — broken since the last commit. Tests assert events, not fades, so they didn't catch it.                                                     | **When relocating an update loop, diff the old loop's call list against the new one line by line.** Refactors are where silent bugs are born.                                                              |
| Skills did nothing at range, but bolts worked                                     | The server validated skill range _instantly_ on cast and silently swallowed out-of-range casts. No chase, no feedback. Bolts had a projectile that could chase; area skills did not.                                                                       | **Skills cast when in range.** Queue the cast, sticky-chase, resolve on arrival. Cost is spent at fire time, never at queue time. Drop on death, target death, or ground order.                            |
| Refresh slid the character across the map to its last position                    | The first snapshot said the player was deep in the field; the client was built at the origin. The mirror lerped between them — at scale, the camera would drag across the map on every join.                                                               | **First-sighting is a teleport, not a movement.** Hard-snap position and camera on the first snapshot — rule 5 in the section above, learned twice.                                                        |

Every rule in this table is small. That's the point. Most production bugs
have small causes. The trick is to write the lesson into the codebase the
moment you find the bug, so the next person doesn't pay the same tuition.

The pattern underneath all of it — the splash, the wall, the button, the
network, the bug table — is the same: **server is truth, browser renders,
capture decisions as memory, name every trap you hit, rewrite everything
that should never be re-decided.** A seven-day constraint is a great teacher
because it makes the tuition due immediately.

_Want a build with this kind of honesty behind it?_ [Start a
project](/#start) — the free consultation and the mockup are part of the
deal.
