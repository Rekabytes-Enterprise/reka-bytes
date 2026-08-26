'use client';

import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface QuizAvgCardProps {
  avg: number | null;
  passed: number;
}

/** Quiz-average card (PRD-04 §5). `null` avg = no attempts yet. */
export function QuizAvgCard({ avg, passed }: QuizAvgCardProps) {
  return (
    <Card className="flex flex-col" data-testid="quiz-avg-card">
      <div className="flex items-center gap-2">
        <Trophy size={14} aria-hidden className="text-accent-dim" />
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">quiz avg</p>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold text-ink">
        {avg === null ? '—' : `${avg}%`}
      </p>
      <p className="mt-1 font-body text-xs text-faint">
        {passed === 0 ? 'no quizzes taken yet' : `${passed} passed`}
      </p>
    </Card>
  );
}