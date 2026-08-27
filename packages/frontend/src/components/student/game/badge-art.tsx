'use client';

/**
 * BadgeArt — hand-drawn SVG emblem series for the 10 achievement badges.
 *
 * Design language ("Chip Emblems", gamified color pass 2026-08):
 *  - Shared frame = a rounded chip with 8 side pins — the "Bytes" motif.
 *    Unlocked, the frame tints in the badge's own hue (lib/badge-style.ts).
 *  - Each glyph is FULL-COLOR with gradients: green sprout, steel-and-gold
 *    sword, gold crown with rose gems, cyan progress ring, teal crosshair
 *    with a red laser dot, ice-violet gem, gold trophy, orange/pink flames,
 *    indigo return arrow with a gold spark. One identity per badge.
 *  - Unlocked = vivid colors + a soft glow in the badge hue.
 *  - Idle animations (2026-08): unlocked badges (svg.badge-live) run subtle
 *    looping motion — sprout sways, sword/trophy rock, flames flicker,
 *    jewels/sparks twinkle, laser dot pulses, arc breathes. Keyframes live in
 *    globals.css (rb-badge-*); transform-box: fill-box keeps SVG children
 *    rotating around their own geometry. Phase staggered per tile via
 *    --badge-delay. Fully disabled under prefers-reduced-motion.
 *  - Locked = the same artwork rendered grayscale at reduced opacity (a
 *    "statue" preview of what you'll earn) + the lock overlay. Canvas-colored
 *    cutouts (trophy check) still read as carved-out in both states.
 *
 * Gradient ids are per-badge (`bga-<key>-…`) so instances never collide.
 * Testids stay in badge-grid.tsx (e2e-16 asserts badge-first-steps etc.);
 * this component is purely the artwork (aria-hidden).
 */
import type { BadgeKey } from '@reka-bytes/shared';
import { withAlpha } from '@/lib/badge-style';
import { cn } from '@/lib/utils';

export function BadgeArt({
  badgeKey,
  unlocked,
  color,
  index = 0,
}: {
  badgeKey: BadgeKey;
  unlocked: boolean;
  /** Per-badge hue (lib/badge-style.ts) driving the frame tint + glow. */
  color?: string;
  /** Position in the collection — staggers idle-animation phase per tile. */
  index?: number;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={cn('size-12', unlocked && 'badge-live', !unlocked && 'text-faint')}
      style={
        unlocked
          ? ({
              ...(color ? { color } : {}),
              '--badge-delay': `${(index % 6) * -0.45}s`,
              ...(color
                ? { filter: `drop-shadow(0 0 5px ${withAlpha(color, 0.5)})` }
                : {}),
            } as React.CSSProperties)
          : undefined
      }
    >
      <ChipFrame color={color} unlocked={unlocked} />
      <g style={unlocked ? undefined : { filter: 'grayscale(1)', opacity: 0.55 }}>
        {GLYPHS[badgeKey]}
      </g>
      {!unlocked && <LockOverlay />}
    </svg>
  );
}

/** Shared chip frame: rounded-square ring + pins + (unlocked) inner wash. */
function ChipFrame({ color, unlocked }: { color?: string; unlocked: boolean }) {
  const tint = unlocked && color ? color : undefined;
  return (
    <>
      {/* side pins — 2 per edge */}
      <g opacity={0.45} fill={tint ?? 'currentColor'}>
        <rect x="13" y="1" width="3" height="4" rx="1" />
        <rect x="32" y="1" width="3" height="4" rx="1" />
        <rect x="13" y="43" width="3" height="4" rx="1" />
        <rect x="32" y="43" width="3" height="4" rx="1" />
        <rect x="1" y="13" width="4" height="3" rx="1" />
        <rect x="1" y="32" width="4" height="3" rx="1" />
        <rect x="43" y="13" width="4" height="3" rx="1" />
        <rect x="43" y="32" width="4" height="3" rx="1" />
      </g>
      {tint && <rect x="6.5" y="6.5" width="35" height="35" rx="9" fill={tint} opacity={0.07} />}
      {unlocked && (
        <>
          {/* sheen: light band sweeping across the chip every few seconds (unlocked only) */}
          <defs>
            <clipPath id="bga-sheen-clip">
              <rect x="7.5" y="7.5" width="33" height="33" rx="8" />
            </clipPath>
            <linearGradient id="bga-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.4" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath="url(#bga-sheen-clip)" className="badge-anim badge-anim-sheen">
            <rect x="-14" y="-6" width="10" height="60" fill="url(#bga-sheen)" />
          </g>
        </>
      )}
      <rect
        x="6.5"
        y="6.5"
        width="35"
        height="35"
        rx="9"
        fill="none"
        stroke={tint ?? 'currentColor'}
        strokeWidth={2.5}
        opacity={unlocked ? 1 : 0.8}
      />
    </>
  );
}

/**
 * Locked marker: canvas plate knocks out the glyph's center, lock icon on top.
 * The grayscale glyph edges stay visible around it — "almost earned" teaser.
 */
function LockOverlay() {
  return (
    <g>
      <rect x="17.5" y="16.5" width="13" height="15" rx="4" fill="var(--color-canvas)" />
      <path
        d="M 21.5 22.5 V 20.5 A 2.5 2.5 0 0 1 26.5 20.5 V 22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <rect x="19.75" y="22.5" width="8.5" height="7" rx={2} />
      <circle cx="24" cy="25.4" r={1.05} fill="var(--color-canvas)" />
      <rect x="23.55" y="25.4" width="0.9" height="2.2" rx={0.45} fill="var(--color-canvas)" />
    </g>
  );
}

const GLYPHS: Record<BadgeKey, React.ReactNode> = {
  // Sprout breaking ground — first steps, growth begins.
  'first-steps': (
    <g>
      <defs>
        <linearGradient id="bga-first-steps-leaf" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#16a34a" />
          <stop offset="1" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <rect x="13" y="35" width="22" height="3" rx="1.5" fill="#8a6a4a" />
      <g className="badge-anim badge-origin-bottom badge-anim-sway">
        <path d="M 24 35 V 26" stroke="#15803d" strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <path d="M 24 25 C 24 18 19 14 12 14 C 13 22 18 25 24 25 Z" fill="url(#bga-first-steps-leaf)" />
        <path d="M 24 25 C 24 18 29 14 36 14 C 35 22 30 25 24 25 Z" fill="url(#bga-first-steps-leaf)" />
      </g>
    </g>
  ),

  // Steel blade, gold guard + pommel, crimson grip — modules, slain.
  'module-slayer': (
    <g transform="translate(24 24) rotate(45)">
      <g className="badge-anim badge-anim-rock">
        <defs>
          <linearGradient id="bga-module-slayer-blade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="0.55" stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <polygon points="-2.4,-15 2.4,-15 0,-19.5" fill="url(#bga-module-slayer-blade)" />
        <rect x="-2.4" y="-15" width="4.8" height="13.5" rx="2" fill="url(#bga-module-slayer-blade)" />
        <rect x="-8" y="-0.8" width="16" height="3.2" rx="1.6" fill="#facc15" />
        <rect x="-2.1" y="3.2" width="4.2" height="6.8" rx="2.1" fill="#b91c1c" />
        <rect x="-2.8" y="11.2" width="5.6" height="5.6" rx="1.6" fill="#facc15" />
      </g>
    </g>
  ),

  // Gold crown with rose gems on the peaks — the whole class, conquered.
  'class-conqueror': (
    <g>
      <defs>
        <linearGradient id="bga-class-conqueror-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <polygon points="12,30 13.5,16 19.5,23 24,13.5 28.5,23 34.5,16 36,30" fill="url(#bga-class-conqueror-gold)" />
      <rect x="12.5" y="31.5" width="23" height="3.8" rx="1.6" fill="#b45309" />
      <circle cx="13.5" cy="13.2" r="1.8" fill="#fb7185" className="badge-anim badge-anim-twinkle" />
      <circle
        cx="24"
        cy="10.6"
        r="1.8"
        fill="#fb7185"
        className="badge-anim badge-anim-twinkle"
        style={{ animationDelay: '0.45s' }}
      />
      <circle
        cx="34.5"
        cy="13.2"
        r="1.8"
        fill="#fb7185"
        className="badge-anim badge-anim-twinkle"
        style={{ animationDelay: '0.9s' }}
      />
    </g>
  ),

  // Progress ring, half lit in cyan→blue, flag planted on the rim.
  'halfway-there': (
    <g>
      <defs>
        <linearGradient id="bga-halfway-there-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="26.5" r="11" fill="none" stroke="#333c4d" strokeWidth={4} />
      <path
        d="M 24 15.5 A 11 11 0 0 1 24 37.5"
        fill="none"
        stroke="url(#bga-halfway-there-arc)"
        strokeWidth={4}
        strokeLinecap="round"
        className="badge-anim badge-anim-glow"
      />
      <rect x="30" y="8.5" width="2.4" height="9.5" rx="1.2" fill="#94a3b8" />
      <polygon points="30,8.5 39,11.2 30,14" fill="#22d3ee" />
    </g>
  ),

  // Teal crosshair with a red laser dot — 10 inline checks, dead center.
  'sharp-shooter': (
    <g>
      <circle cx="24" cy="24" r="12" fill="none" stroke="#14b8a6" strokeWidth={2.6} opacity={0.45} />
      <circle cx="24" cy="24" r="7.2" fill="none" stroke="#2dd4bf" strokeWidth={2.6} />
      <circle cx="24" cy="24" r="2.8" fill="#f43f5e" className="badge-anim badge-anim-pulse" />
      <path
        d="M 24 9 V 12.5 M 24 35.5 V 39 M 9 24 H 12.5 M 35.5 24 H 39"
        stroke="#2dd4bf"
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),

  // Ice-to-violet faceted gem with a gold sparkle — a flawless run.
  'perfect-run': (
    <g>
      <defs>
        <linearGradient id="bga-perfect-run-gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <g className="badge-anim badge-anim-bob">
        <polygon
          points="24,9.5 36.5,19.5 24,38.5 11.5,19.5"
          fill="url(#bga-perfect-run-gem)"
          stroke="#e0f2fe"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path
          d="M 11.5 19.5 H 36.5 M 24 9.5 L 17.5 19.5 M 24 9.5 L 30.5 19.5 M 17.5 19.5 L 24 38.5 M 30.5 19.5 L 24 38.5"
          fill="none"
          stroke="#e0f2fe"
          strokeWidth={1.4}
          opacity={0.75}
        />
      </g>
      <polygon
        points="14,8.5 15.2,11.3 18,12.5 15.2,13.7 14,16.5 12.8,13.7 10,12.5 12.8,11.3"
        fill="#fef08a"
        className="badge-anim badge-anim-twinkle"
        style={{ animationDelay: '0.6s' }}
      />
    </g>
  ),

  // Gold trophy (gradient) with carved-out checkmark — quizzes, passed.
  'quiz-champion': (
    <g>
      <defs>
        <linearGradient id="bga-quiz-champion-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <g className="badge-anim badge-origin-bottom badge-anim-rock">
        <path d="M 15 11.5 H 33 V 19 A 9 9 0 0 1 15 19 Z" fill="url(#bga-quiz-champion-gold)" />
        <circle cx="12.2" cy="17" r="3.2" fill="none" stroke="#facc15" strokeWidth={2.2} opacity={0.9} />
        <circle cx="35.8" cy="17" r="3.2" fill="none" stroke="#facc15" strokeWidth={2.2} opacity={0.9} />
        <path
          d="M 19.5 19 L 23 22.5 L 28.5 16"
          fill="none"
          stroke="var(--color-canvas)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <rect x="21.8" y="27.5" width="4.4" height="3.6" fill="#ca8a04" />
      <rect x="17" y="31.5" width="14" height="3.4" rx="1.4" fill="#b45309" />
      <rect x="15" y="35.6" width="18" height="2.8" rx="1.4" fill="#92400e" />
    </g>
  ),

  // Ember flame (orange→red) with a hot yellow core over 7 ticks — week burned bright.
  'week-warrior': (
    <g>
      <defs>
        <linearGradient id="bga-week-warrior-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="bga-week-warrior-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path
        d="M 24 7.5 C 28.8 13.2 32.5 16.6 32.5 22.8 A 8.5 8.5 0 0 1 15.5 22.8 C 15.5 16.6 19.2 13.2 24 7.5 Z"
        fill="url(#bga-week-warrior-flame)"
        className="badge-anim badge-origin-bottom badge-anim-flicker"
      />
      <path
        d="M 24 16.5 C 26.2 19.3 28 20.8 28 23.6 A 4 4 0 0 1 20 23.6 C 20 20.8 21.8 19.3 24 16.5 Z"
        fill="url(#bga-week-warrior-core)"
        className="badge-anim badge-origin-bottom badge-anim-flicker-core"
      />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={10 + i * 4.2} y="35" width="2.7" height="2.8" rx={0.9} fill="#fb923c" opacity={0.6} />
      ))}
    </g>
  ),

  // Hot-streak pink flame over two rows of ticks — 14 days in flow.
  'fortnight-flow': (
    <g>
      <defs>
        <linearGradient id="bga-fortnight-flow-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="1" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="bga-fortnight-flow-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fce7f3" />
          <stop offset="1" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>
      <path
        d="M 24 7.5 C 28.8 13.2 32.5 16.6 32.5 22.8 A 8.5 8.5 0 0 1 15.5 22.8 C 15.5 16.6 19.2 13.2 24 7.5 Z"
        fill="url(#bga-fortnight-flow-flame)"
        className="badge-anim badge-origin-bottom badge-anim-flicker"
      />
      <path
        d="M 24 16.5 C 26.2 19.3 28 20.8 28 23.6 A 4 4 0 0 1 20 23.6 C 20 20.8 21.8 19.3 24 16.5 Z"
        fill="url(#bga-fortnight-flow-core)"
        className="badge-anim badge-origin-bottom badge-anim-flicker-core"
      />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={10 + i * 4.2} y="33.8" width="2.7" height="2.5" rx={0.9} fill="#f472b6" opacity={0.6} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={`b${i}`} x={10 + i * 4.2} y="37.3" width="2.7" height="2.5" rx={0.9} fill="#f472b6" opacity={0.6} />
      ))}
    </g>
  ),

  // Indigo return arrow with a gold spark — came back after time away.
  'comeback-kid': (
    <g>
      <defs>
        <linearGradient id="bga-comeback-kid-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M 14 31.5 V 22 A 10 10 0 0 1 24 12 H 30"
        fill="none"
        stroke="url(#bga-comeback-kid-arc)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <polygon points="29,7 37.5,12 29,17" fill="#818cf8" />
      <polygon
        points="35,24.5 36.9,27.6 40,29.5 36.9,31.4 35,34.5 33.1,31.4 30,29.5 33.1,27.6"
        fill="#fde047"
        className="badge-anim badge-anim-twinkle"
        style={{ animationDelay: '0.7s' }}
      />
      <circle cx="14" cy="36.5" r="2" fill="#6366f1" opacity={0.5} />
    </g>
  ),
};
