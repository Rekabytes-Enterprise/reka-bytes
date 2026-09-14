'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { apiFetch, isApiClientError, type SessionUser } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { StatusBadge } from '@/components/ui/status-badge';

const STATUS_COPY: Record<
  SessionUser['status'],
  { title: (cohort: string) => string; body: string }
> = {
  PENDING: {
    title: () => 'Application under review',
    body: 'We review every application personally. Check back soon — you will see your status change here the moment a decision is made.',
  },
  APPROVED: {
    title: (cohort) => `You're in — welcome to ${cohort} 🎉`,
    body: 'Congratulations! Your seat is confirmed. The Discord invite has been sent to your email / will be shared by the team. Class materials open on day one of the cohort.',
  },
  REJECTED: {
    title: () => 'Application not accepted this time',
    body: 'Thank you for applying. This cohort is intentionally tiny, so we could not take everyone. Keep an eye out for the next intake.',
  },
};

export default function StatusPage() {
  const router = useRouter();

  const session = useAtomValue(sessionAtom);
  const setSession = useSetAtom(sessionAtom);
  const [state, setState] = useState<'loading' | 'ready'>('loading');
  // One-shot auto-redirect: fires only on the first approved visit (per browser),
  // so returning to /status later shows no countdown and never traps the user.
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<SessionUser>('/api/auth/me')
      .then((user) => {
        if (cancelled) return;
        setSession(user);
        setState('ready');
        if (
          user.status === 'APPROVED' &&
          typeof window !== 'undefined' &&
          !window.sessionStorage.getItem('rb-status-redirected')
        ) {
          window.sessionStorage.setItem('rb-status-redirected', '1');
          setCountdown(5);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (isApiClientError(e) && (e.status === 401 || e.status === 0)) {
          router.replace('/login');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router, setSession]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      router.replace('/dashboard');
      return;
    }
    const timer = setTimeout(() => setCountdown((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSession(null);
    router.push('/login');
  }

  if (state === 'loading') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center px-6">
        <p
          className="font-mono text-xs uppercase tracking-[0.12em] text-faint"
          data-testid="status-loading"
        >
          // loading status…
        </p>
      </main>
    );
  }

  const user = session;
  if (!user) return null;

  const copy = STATUS_COPY[user.status];
  const cohortName = user.cohortName || 'the cohort';

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
      <div
        className="border border-line bg-elevated p-12"
        data-testid={`status-card-${user.status}`}
      >
        <div className="flex items-center justify-between gap-4">
          <StatusBadge status={user.status} />
          <button
            type="button"
            onClick={logout}
            className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-danger"
          >
            log out
          </button>
        </div>
        <h1 className="mt-10 font-display text-4xl font-semibold">{copy.title(cohortName)}</h1>
        <p className="mt-5 font-body text-sm leading-relaxed text-muted">{copy.body}</p>

        <dl className="mt-10 grid grid-cols-[120px_1fr] gap-y-3 border-t border-line pt-8">
          <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            Name
          </dt>
          <dd className="font-body text-sm">{user.name}</dd>
          <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            Email
          </dt>
          <dd className="font-body text-sm">{user.email}</dd>
        </dl>

        {user.status === 'APPROVED' ? (
          <div className="mt-10 border-t border-line pt-8" data-testid="status-approved-actions">
            {countdown !== null && (
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
                taking you to your dashboard in {countdown}s…
              </p>
            )}
            <button
              type="button"
              onClick={() => router.replace('/dashboard')}
              data-testid="status-enter-dashboard"
              className="mt-4 inline-block bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover"
            >
              enter dashboard →
            </button>
          </div>
        ) : (
          <Link
            href="/academy"
            className="mt-10 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline"
          >
            ← back to reka·bytes academy
          </Link>
        )}
      </div>
    </main>
  );
}
