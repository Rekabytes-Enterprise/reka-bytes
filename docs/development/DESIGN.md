# Design System — Reka Bytes

> Direction: **"Terminal Editorial"** — an engineering-blueprint aesthetic. Not another
> purple-gradient AI landing page. Feels like a printed zine crossed with a code editor.

Companion to `docs/development/PRD.md`.

---

## 1. Design Concept

### 1.1 The Idea

Reka Bytes sits between **creativity (Reka)** and **machine precision (Bytes)**. The visual language expresses exactly that tension:

- **Editorial side**: oversized display type, asymmetric grids, generous whitespace, magazine-style left-text/right-image layouts, numbered sections like a syllabus.
- **Machine side**: monospace annotations, hairline grid/blueprint overlays, ASCII ornaments (`//`, `→`, `{}`, `0b01000001`), subtle scanline/noise texture.
- **Signature motif**: the **byte stream** — a WebGL particle field of drifting 0/1 glyphs in the hero that reacts to cursor movement and assembles into shapes on scroll. This is the "unique, not AI-generated" moment.

### 1.2 Layout Principles

| Rule | Detail |
|---|---|
| Asymmetric split | Hero & feature sections use a **7/5 or 8/4 column split** (left text, right visual) — never centered-everything |
| Baseline grid | 8px spacing scale only: `2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128` |
| Hairlines over cards | Landing keeps pure hairlines. **Student app (2026-08, PRD-04) switched to "Soft Terminal": rounded elevated cards** — see §5a |
| Numbered everything | Section labels in mono: `01 / REGISTER`, `02 / CURRICULUM` |
| Marquee strip | Thin scrolling ticker of mono terms between sections (`ARCHITECTURE → DEBUGGING → GIT → APIS →`) |
| Max width | 1200px content, full-bleed for hero/visuals |

### 1.3 Motion (framer-motion)

- Page/section entrances: fade + 16px rise, staggered 60ms per child.
- Hero byte-stream reacts to pointer; text lines reveal with clip-path wipe (not bounce).
- Buttons: no scale-bounce — background fill sweep on hover (150ms ease-out).
- Respect `prefers-reduced-motion`: disable WebGL drift + reveals become instant.

---

## 2. Color Tokens (HEX)

Dark-first (default). Single accent family keeps it restrained; the accent is **acid lime** — techy, energetic, not the default blue/purple every AI page uses.

```ts
// packages/shared/src/theme/colors.ts
export const colors = {
  // Core surfaces (dark)
  bgPrimary:    '#0A0B0D',   // near-black, slightly cool — main canvas
  bgElevated:   '#111318',   // raised surfaces, nav, modals
  bgInset:      '#16191F',   // inset panels, code blocks, inputs

  // Text
  textPrimary:  '#F2F4F1',   // off-white, warm-neutral
  textSecondary:'#9BA3AB',   // muted body/captions
  textFaint:    '#4A5158',   // placeholders, disabled, hairline labels

  // Accent — acid lime
  accent:       '#C6FF4A',   // primary CTA, links, highlights
  accentHover:  '#D8FF7A',
  accentDim:    '#84A82F',   // pressed / low-emphasis accent
  accentInk:    '#0A0B0D',   // text ON accent fills

  // Semantic
  success:      '#4ADE80',   // approved, pass
  warning:      '#FACC15',   // pending review
  danger:       '#F45B69',   // rejected, errors, destructive
  info:         '#6EC1FF',

  // Lines & structure
  border:       '#23262D',   // hairlines, dividers
  borderStrong: '#363B44',   // hover borders, focus rings

  // Overlays
  overlayScrim: 'rgba(10,11,13,0.72)',
} as const;
```

Light mode (P4+, same token names):

```ts
export const colorsLight = {
  bgPrimary: '#FAFAF7', bgElevated: '#FFFFFF', bgInset: '#F0F1EC',
  textPrimary: '#14161A', textSecondary: '#565E66', textFaint: '#9AA1A9',
  accent: '#5C8A00', accentHover: '#4E7700', accentDim: '#8FB83B', accentInk: '#FFFFFF',
  border: '#E3E5DE', borderStrong: '#C9CCC2',
  // semantic unchanged except danger/info slightly darkened for contrast
} as const;
```

Contrast rule: all body text ≥ 4.5:1 against its surface; accent used for ≤20% of any viewport.

## 3. Typography

Three-voice system: display (attitude), body (clarity), mono (engineering).

| Voice | Font | Weights | Use |
|---|---|---|---|
| Display | **Clash Display** (fontshare) | 500, 600 | Hero headlines, section titles, big numbers |
| Body | **Inter** (next/font) | 400, 500, 600 | Paragraphs, UI labels, forms |
| Mono | **JetBrains Mono** (next/font) | 400, 700 | Code, labels/tickers, data, ornaments |

Fallbacks: `"Inter", system-ui, sans-serif` / `"JetBrains Mono", ui-monospace, monospace`.

### Type Scale (fluid with clamp)

| Token | Size | Weight | Tracking |
|---|---|---|---|
| `displayXL` | clamp(3rem, 8vw, 6.5rem) | Clash 600 | -0.03em |
| `displayL` | clamp(2.25rem, 5vw, 4rem) | Clash 600 | -0.02em |
| `displayM` | clamp(1.75rem, 3.5vw, 2.75rem) | Clash 500 | -0.01em |
| `headingS` | 1.25rem / 1.125rem | Inter 600 | -0.01em |
| `body` | 1rem | Inter 400 | normal |
| `bodySm` | 0.875rem | Inter 400 | normal |
| `label` | 0.75rem uppercase | Mono 700 | +0.12em |
| `mono` | 0.875rem | Mono 400 | normal |

Rule: max ~55ch measure for body; headlines may break lines aggressively for editorial feel.

---

## 4. Theme Hooks

Live in `packages/frontend/src/hooks/` (admin mirrors them via shared tokens).

### 4.1 `useTheme()` — color access + mode

```tsx
// hooks/use-theme.ts
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { colors, colorsLight } from '@reka-bytes/shared/theme';

const themeModeAtom = atomWithStorage<'dark' | 'light'>('reka-theme', 'dark');

export function useTheme() {
  const [mode, setMode] = useAtom(themeModeAtom);
  const palette = mode === 'dark' ? colors : colorsLight;

  return {
    mode,
    setMode,
    toggle: () => setMode(m => (m === 'dark' ? 'light' : 'dark')),
    c: palette,          // c.accent, c.bgPrimary, ...
    isDark: mode === 'dark',
  } as const;
}
```

Implementation notes:
- Palette also injected as CSS variables on `<html>` (`--bg-primary`, `--accent`, …) so Tailwind classes map to tokens; hook reads typed constants for canvas/WebGL/framer-motion values where CSS vars can't be used.
- Mode applied pre-hydration via inline script to prevent flash.

### 4.2 `useTypography()` — type styles as objects

```tsx
// hooks/use-typography.ts
import { typeStyles } from '@reka-bytes/shared/theme';
import { cn } from '@/lib/utils';

export function useTypography() {
  const t = typeStyles; // { displayXL, displayL, ..., label, mono }
  /** class helper: ty('displayL', 'extra-class') */
  const ty = (...tokens: (keyof typeof typeStyles)[] | [string]) =>
    cn(...(tokens as string[]));
  return { t, ty };
}
```

Each token maps to a Tailwind component string (font-family + size clamp + weight + tracking), defined once in `packages/shared/src/theme/typography.ts` and consumed by both frontend and admin — single source of truth.

### 4.3 Supporting hooks

| Hook | Purpose |
|---|---|
| `useMediaQuery(q)` | Responsive logic without CSS hacks (e.g., disable WebGL under 768px) |
| `useReducedMotion()` | Wraps framer-motion's — gates byte-stream animation |
| `useInViewOnce(ref)` | Fires section reveal animations a single time |
| `useByteStream(canvasRef)` | Encapsulates the WebGL hero (OGL); lazy-init, pause when offscreen/tab hidden |

---

## 5. Component Language

| Element | Spec |
|---|---|
| Button primary | Accent fill, `accentInk` text, square corners (2px radius), mono uppercase label, fill-sweep hover |
| Button ghost | 1px `borderStrong`, transparent bg, hover border → accent |
| Inputs | `bgInset` fill, 1px `border`, focus ring accent 2px, mono placeholder in `textFaint` |
| Cards/panels | `bgElevated` + corner ticks; status conveyed by a 2px left edge in semantic color |
| Badges (status) | PENDING `warning`, APPROVED `success`, REJECTED `danger` — dot + mono uppercase text |
| Ticker/marquee | `bgElevated` strip, `label` style, infinite CSS translate loop, pauses on hover |
| Section header | `[mono label 01 / NAME]` above a `displayM` title, hairline underneath spanning full column |
| Toasts | Bottom-right stack, left-edge semantic stripe, auto-dismiss 5s, framer-motion slide-in |

### 5a. Soft Terminal geometry — student app (PRD-04, shipped)

The student app keeps every token above but swaps blueprint geometry for rounded product surfaces:

| Aspect | Spec |
|---|---|
| Radius tokens (`@theme`) | `--radius-input: 10px` (inputs, badges, code) · `--radius-panel: 14px` (ghost buttons, inner panels, module rows) · `--radius-card: 20px` (cards, modals). Utilities: `rounded-input/panel/card`. Pills = `rounded-full` |
| Elevation tokens | `--shadow-card` (inset top highlight + soft ambient) · `--shadow-lift` (hover). `.card-surface` composes bg/border/radius/shadow |
| Buttons | Primary = **pill**, lime fill; ghost = `rounded-panel`; danger = pill with danger border/tint |
| Cards | `.card-surface`; interactive cards get hover lift `-translate-y-0.5` + brighter border; **testids are frozen** through reskins |
| Badges | Tinted pills — semantic color at 10% alpha background + dot + mono text |
| Sidebar | Floating rounded rail (`card-surface`, inset 16px), **pill-shaped active nav item** (`bg-accent/10`); mobile drawer backdrop-blur |
| Accent glow | `.glow-accent` radial wash — achievement surfaces ONLY (hero/CTA), never decoration |
| Motion | Hover lifts spring `y:-0.5..-2px`; staggered card entrance 60ms; all gated by `prefers-reduced-motion`. Gamification visual language (XP bars, level pills, celebrations) lands with PRD-04 R3 |

Gamification UI follows the same rules once PRD-04 R3 ships.

## 6. Signature Screens (Phase 0)

### Landing `/`
1. **Hero** — 8/4 split: left = `displayXL` headline ("Learn to vibe code *properly*."), mono sub-line, CTA pair, seats-left chip; right = full-height WebGL byte-stream canvas bleeding to viewport edge.
2. **Ticker** — curriculum terms marquee.
3. **Problem section** (`01 / WHY`) — left sticky heading, right stacked statements with hairline rules.
4. **Curriculum** (`02 / BASICS CLASS`) — 2-col module list, numbered rows, hover shifts row 8px right.
5. **Instructor** (`03 / WHO TEACHES YOU`) — left portrait w/ halftone treatment, right bio + credential badges (SWE grad, Google PM cert).
6. **Registration** (`04 / JOIN COHORT 001`) — cap meter `3/5 SEATS CLAIMED`, register CTA; if full → waitlist teaser.
7. Footer — mono ASCII logo mark, minimal links.

### Register `/register`
Multi-step (Account → Questionnaire → Review), framer-motion horizontal slide between steps, progress rail on left showing `STEP 1/3` in mono; validation errors inline in `danger` mono.

### Admin
Same tokens but denser: table rows as hairline-divided list rows (not boxed cards), application detail as two-pane (answers left, decision panel right), cap meter as segmented bar of 5 blocks.

## 7. Accessibility

- All interactive elements keyboard-reachable; visible focus rings (`borderStrong` → accent outline).
- WebGL hero is decorative: `aria-hidden`, static fallback poster for reduced-motion.
- Status never conveyed by color alone (badge always has text).
- Minimum hit target 44×44px.

---

*Maintained in `docs/development/DESIGN.md`. Tokens are the single source of truth — implement once in `packages/shared/src/theme/`, consume everywhere.*
