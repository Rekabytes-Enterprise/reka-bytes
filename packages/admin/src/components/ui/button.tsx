'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

/** Square-cornered, mono uppercase, fill-sweep hover — see DESIGN.md §5. */
export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden px-7 py-3.5',
        'font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-accent-ink hover:bg-accent-hover',
        variant === 'ghost' &&
          'border border-line-strong text-ink hover:border-accent hover:text-accent',
        variant === 'danger' && 'bg-danger text-white hover:bg-danger/90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
