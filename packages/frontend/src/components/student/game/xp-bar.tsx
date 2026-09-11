'use client';

import { motion } from 'framer-motion';

interface XpBarProps {
  intoLevel: number;
  forNextLevel: number;
  level: number;
}

/** Slim animated XP progress to next level (PRD-04 §5). */
export function XpBar({ intoLevel, forNextLevel, level }: XpBarProps) {
  const pct = forNextLevel === 0 ? 0 : Math.min(100, Math.round((intoLevel / forNextLevel) * 100));
  const remaining = Math.max(0, forNextLevel - intoLevel);
  return (
    <div className="mt-3" data-testid="xp-bar">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          lvl {level} · progress to {level + 1}
        </span>
        <span className="font-mono text-[10px] text-faint">
          {intoLevel}/{forNextLevel} · {remaining} to go
        </span>
      </div>
      <span
        className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-inset ring-1 ring-line/60"
        aria-hidden
      >
        <motion.span
          className="block h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </span>
    </div>
  );
}
