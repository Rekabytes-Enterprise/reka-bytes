'use client';

import { Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StreakCardProps {
  current: number;
  longest: number;
  activeToday: boolean;
}

/**
 * Streak card (PRD-04 §5). Flame dims + "do today's lesson to keep it"
 * nudge when `activeToday=false`. Always shows `longest` as a quiet
 * stat so users see progress even on day-0 streaks.
 */
export function StreakCard({ current, longest, activeToday }: StreakCardProps) {
  return (
    <Card className="flex flex-col" data-testid="streak-card">
      <div className="flex items-center gap-2">
        <Flame
          size={14}
          aria-hidden
          className={activeToday ? 'text-warning' : 'text-faint'}
          fill={activeToday ? 'currentColor' : 'none'}
        />
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">streak</p>
      </div>
      <p className={`mt-4 font-display text-3xl font-semibold ${activeToday ? 'text-ink' : 'text-muted'}`}>
        {current} <span className="text-base font-normal text-faint">day{current === 1 ? '' : 's'}</span>
      </p>
      <p className="mt-1 font-body text-xs text-faint">
        {activeToday ? (
          <>
            longest <span className="font-mono text-ink">{longest}</span>
          </>
        ) : (
          <>complete a lesson today to keep it</>
        )}
      </p>
    </Card>
  );
}