'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
  className?: string;
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="font-body text-xs text-faint">{hint}</p>}
      {error && (
        <p role="alert" className="font-mono text-xs text-danger">
          // {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full bg-inset px-4 py-3 font-body text-sm text-ink placeholder:text-faint',
        'border border-line transition-colors focus:border-line-strong focus:outline-none',
        invalid && 'border-danger',
        className,
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-24 w-full resize-y bg-inset px-4 py-3 font-body text-sm text-ink placeholder:text-faint',
        'border border-line transition-colors focus:border-line-strong focus:outline-none',
        invalid && 'border-danger',
        className,
      )}
      {...props}
    />
  );
}
