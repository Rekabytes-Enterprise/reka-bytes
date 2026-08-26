'use client';

import { BADGES, type BadgeKey, type BadgeState } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  /** Server-evaluated unlock states keyed by BADGE_KEYS order. */
  badges: readonly BadgeState[];
}

/**
 * Badge collection grid (PRD-04 §5). Locked badges render as silhouettes
 * with their unlock hint — collection pull without pressure.
 */
export function BadgeGrid({ badges }: BadgeGridProps) {
  const byKey = new Map<BadgeKey, BadgeState>(badges.map((b) => [b.key, b]));
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="badge-grid"
    >
      {BADGES.map((meta) => {
        const unlocked = byKey.get(meta.key)?.unlocked ?? false;
        return (
          <li
            key={meta.key}
            data-testid={`badge-${meta.key}`}
            data-unlocked={unlocked}
            className={cn(
              'flex flex-col items-center gap-2 rounded-card border p-4 text-center transition-colors',
              unlocked
                ? 'border-accent/30 bg-accent/5'
                : 'border-line bg-inset/60 opacity-70',
            )}
          >
            <BadgeGlyph unlocked={unlocked} />
            <span
              className={cn(
                'font-mono text-[10px] font-bold uppercase tracking-[0.16em]',
                unlocked ? 'text-accent' : 'text-faint',
              )}
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

function BadgeGlyph({ unlocked }: { unlocked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-12 items-center justify-center rounded-full border text-lg',
        unlocked
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-line bg-canvas/60 text-faint',
      )}
    >
      {unlocked ? '★' : '○'}
    </span>
  );
}