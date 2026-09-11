'use client';

import { formatApiError, isApiClientError, type SeatsDTO } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/hooks/api-query';
import { usePushToast } from '@/components/system/toaster';

/**
 * Live cohort seats meter. `chip` = compact hero chip, `block` = full
 * segmented cap meter for the registration section.
 */
export function SeatsMeter({ variant }: { variant: 'chip' | 'block' }) {
  const pushToast = usePushToast();
  // Network failures (`status === 0`) are tolerated as "seats unavailable";
  // everything else surfaces as a toast.
  const {
    data: seats,
    loading,
    error,
  } = useApiQuery<SeatsDTO>('/api/public/seats', {
    toastError: false,
    onError: (e) => {
      if (isApiClientError(e) && e.status === 0) return; // tolerate
      const { title, description } = formatApiError(e);
      pushToast({ variant: 'error', title, description });
    },
  });

  const netFail = error !== null && isApiClientError(error) && error.status === 0;

  if (loading && !seats) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading seats…</p>
    );
  }
  if (netFail && !seats) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
        // seats unavailable
      </p>
    );
  }
  if (!seats) return null;

  const full = seats.remaining === 0;

  if (variant === 'chip') {
    return (
      <p
        className={cn(
          'inline-flex items-center gap-2 border px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em]',
          full ? 'border-danger text-danger' : 'border-accent-dim text-accent',
        )}
        data-testid="seats-chip"
      >
        <span className="size-2 rounded-full bg-current" aria-hidden />
        {full ? 'Cohort 001 — full' : `${seats.remaining}/${seats.cap} seats left — cohort 001`}
      </p>
    );
  }

  return (
    <div data-testid="seats-meter">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Cohort 001 capacity
        </p>
        <p className={cn('font-mono text-sm font-bold', full ? 'text-danger' : 'text-accent')}>
          {seats.approved}/{seats.cap} CLAIMED
        </p>
      </div>
      <div
        className="mt-4 flex gap-1.5"
        role="img"
        aria-label={`${seats.approved} of ${seats.cap} seats claimed`}
      >
        {Array.from({ length: seats.cap }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-6 flex-1',
              i < seats.approved ? 'bg-accent' : 'bg-inset border border-line',
            )}
          />
        ))}
      </div>
      {full && (
        <p className="mt-3 font-mono text-xs text-danger">
          {'// cohort full — waitlist opens next intake'}
        </p>
      )}
    </div>
  );
}
