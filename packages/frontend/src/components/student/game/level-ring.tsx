'use client';

import { motion } from 'framer-motion';

interface LevelRingProps {
  level: number;
  intoLevel: number;
  forNextLevel: number;
  /** Initials to show inside the ring (e.g. user.name initials). */
  initials: string;
}

/**
 * Circular progress ring for the sidebar (PRD-04 §5). Constant momentum UI
 * that nudges users toward their next level.
 */
export function LevelRing({ level, intoLevel, forNextLevel, initials }: LevelRingProps) {
  const radius = 18;
  const stroke = 2;
  const size = (radius + stroke) * 2 + 4;
  const circumference = 2 * Math.PI * radius;
  const pct = forNextLevel === 0 ? 0 : Math.min(100, (intoLevel / forNextLevel) * 100);
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex items-center gap-3" data-testid="sidebar-level-ring">
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-line"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-accent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        <span className="relative font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
          L{level}
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated font-mono text-[11px] font-bold text-ink ring-1 ring-line">
        {initials}
      </span>
    </div>
  );
}