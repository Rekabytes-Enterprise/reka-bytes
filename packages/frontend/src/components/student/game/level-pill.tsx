'use client';

/** Pill level chip (PRD-04 §5). Used in dashboard header + sidebar. */
export function LevelPill({ level }: { level: number }) {
  return (
    <span
      data-testid="level-pill"
      className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-1.5 text-accent ring-1 ring-accent/30"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]">lvl</span>
      <span className="font-display text-sm font-semibold">{level}</span>
    </span>
  );
}
