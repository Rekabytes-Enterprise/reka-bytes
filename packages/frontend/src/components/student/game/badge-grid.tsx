'use client';

import { BADGES, type BadgeKey, type BadgeState } from '@reka-bytes/shared';
import { BadgeArt } from '@/components/student/game/badge-art';
import { BADGE_COLORS } from '@/lib/badge-style';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  /** Server-evaluated unlock states keyed by BADGE_KEYS order. */
  badges: readonly BadgeState[];
}

/**
 * Badge collection grid (PRD-04 §5). Each badge carries its own hue
 * (lib/badge-style.ts): unlocked tiles tint in the badge's color with a
 * colored label; locked ones stay neutral with their unlock hint —
 * collection pull without pressure.
 */
export function BadgeGrid({ badges }: BadgeGridProps) {
  const byKey = new Map<BadgeKey, BadgeState>(badges.map((b) => [b.key, b]));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="badge-grid">
      {BADGES.map((meta, i) => {
        const unlocked = byKey.get(meta.key)?.unlocked ?? false;
        const color = BADGE_COLORS[meta.key];
        return (
          <li
            key={meta.key}
            data-testid={`badge-${meta.key}`}
            data-unlocked={unlocked}
            style={{ '--badge': color } as React.CSSProperties}
            className={cn(
              'flex flex-col items-center gap-2 rounded-card border p-4 text-center transition-colors',
              unlocked
                ? 'border-[color-mix(in_srgb,var(--badge)_38%,transparent)] bg-[color-mix(in_srgb,var(--badge)_6%,transparent)] hover:border-[color-mix(in_srgb,var(--badge)_68%,transparent)] hover:bg-[color-mix(in_srgb,var(--badge)_11%,transparent)]'
                : 'border-line bg-inset/60 hover:border-line-strong',
            )}
          >
            <BadgeArt badgeKey={meta.key} unlocked={unlocked} color={color} index={i} />
            <span
              className={cn(
                'flex min-h-[30px] items-center justify-center font-mono text-[10px] font-bold uppercase leading-[15px] tracking-[0.16em]',
                !unlocked && 'text-muted',
              )}
              style={unlocked ? { color } : undefined}
            >
              {meta.label}
            </span>
            <span className="font-body text-[11px] leading-snug text-faint">{meta.hint}</span>
          </li>
        );
      })}
    </ul>
  );
}
