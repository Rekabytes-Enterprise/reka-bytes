import { cn } from '@/lib/utils';
import type { UserStatus } from '@reka-bytes/shared';

const statusStyles: Record<UserStatus, string> = {
  PENDING: 'text-warning',
  APPROVED: 'text-success',
  REJECTED: 'text-danger',
};

/** Status badge — dot + mono uppercase text so color is never the only signal. */
export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em]',
        statusStyles[status],
        className,
      )}
    >
      <span className={cn('size-2 rounded-full bg-current')} aria-hidden />
      {status}
    </span>
  );
}
