'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isApiClientError, type SessionUser } from '@reka-bytes/shared';

type GuardState = 'loading' | 'ready';

/** Admin guard — 401/403 or non-ADMIN role → /login. */
export function useAdminGuard(): GuardState {
  const router = useRouter();
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    let cancelled = false;
    apiFetch<SessionUser>('/api/auth/me')
      .then((user) => {
        if (cancelled) return;
        if (user.role !== 'ADMIN') {
          router.replace('/login');
          return;
        }
        setState('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (isApiClientError(e) && (e.status === 401 || e.status === 403 || e.status === 0)) {
          router.replace('/login');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return state;
}
