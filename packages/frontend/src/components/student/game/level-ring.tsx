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
 * Avatar-in-progress-ring for the sidebar profile button (PRD-04 §5).
 * The user's initials sit inside the XP ring; the level chip overlaps
 * bottom-right so avatar, level, and progress read as one unit.
 */
export function LevelRing({ level, intoLevel, forNextLevel, initials }: LevelRingProps) {
  const radius = 18;
  const stroke = 2;
  const size = (radius + stroke) * 2 + 4; // 44px box
  const circumference = 2 * Math.PI * radius;
  const pct = forNextLevel === 0 ? 0 : Math.min(100, (intoLevel / forNextLevel) * 100);
  const offset = circumference * (1 - pct / 100);

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="sidebar-level-ring"
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
      {/* Initials avatar, centered inside the ring */}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated font-mono text-[11px] font-bold text-ink ring-1 ring-line">
        {initials}
      </span>
      {/* Level chip — overlaps the ring's bottom-right; elevated ring keeps it
          separated from the progress arc behind it. */}
      <span
        data-testid="sidebar-level-chip"
        className="absolute -bottom-1 -right-1.5 rounded-full bg-accent px-1.5 py-px font-mono text-[9px] font-bold leading-[1.3] text-accent-ink ring-2 ring-elevated"
      >
        L{level}
      </span>
    </span>
  );
}
