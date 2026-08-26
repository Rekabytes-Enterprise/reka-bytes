'use client';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Hover lift + brighter border — set ONLY on cards acting as
   * links/buttons or previewing clickable content (PRD-04 §6 motion rules).
   */
  interactive?: boolean;
}

/** Rounded elevated surface — the "Soft Terminal" card language (PRD-04 §2.4). */
export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card-surface p-6',
        interactive &&
          'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift',
        className,
      )}
      {...props}
    />
  );
}
