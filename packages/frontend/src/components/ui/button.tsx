'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

/**
 * "Soft Terminal" buttons (PRD-04 §2.4): pill primary, rounded ghost,
 * danger for destructive actions. Mono uppercase label + fill-sweep hover kept.
 */
export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden px-7 py-3.5',
        'font-mono text-xs font-bold uppercase tracking-[0.12em] transition-all',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'rounded-full bg-accent text-accent-ink hover:bg-accent-hover',
        variant === 'ghost' &&
          'rounded-panel border border-line-strong text-ink hover:border-accent hover:text-accent',
        variant === 'danger' &&
          'rounded-full border border-danger/50 text-danger transition-colors hover:border-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
