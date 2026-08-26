import { cn } from '@/lib/utils';
import type { UserStatus } from '@reka-bytes/shared';

const statusStyles: Record<UserStatus, string> = {
  PENDING: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-danger/10 text-danger',
};

/**
 * Status badge — tinted pill (PRD-04 §2.4): semantic background at low alpha +
 * dot + mono uppercase text so color is never the only signal.
 */
export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'font-mono text-xs font-bold uppercase tracking-[0.12em]',
        statusStyles[status],
        className,
      )}
    >
      <span className={cn('size-2 rounded-full bg-current')} aria-hidden />
      {status}
    </span>
  );
}
