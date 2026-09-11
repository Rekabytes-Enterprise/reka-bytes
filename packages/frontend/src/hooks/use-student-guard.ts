'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { apiFetch, isApiClientError, type SessionUser } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { usePushToast } from '@/components/system/toaster';

type GuardState = 'loading' | 'ready';

/**
 * Approved-only guard for the (student) route group.
 * 401 → /login · ADMIN role → /login (toast) · non-APPROVED → /status (with toast) · otherwise ready.
 */
export function useStudentGuard(): GuardState {
  const router = useRouter();
  const setSession = useSetAtom(sessionAtom);
  const pushToast = usePushToast();
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    let cancelled = false;
    apiFetch<SessionUser>('/api/auth/me')
      .then((user) => {
        if (cancelled) return;
        // Defense in depth against stale/cross-app admin cookies: a shared
        // rb_session cookie on localhost means an admin-console session can
        // arrive here. Never render the student surface for it.
        if (user.role === 'ADMIN') {
          pushToast({
            variant: 'error',
            title: 'Admin accounts must use the admin console.',
          });
          router.replace('/login');
          return;
        }
        setSession(user);
        if (user.status !== 'APPROVED') {
          pushToast({
            variant: 'error',
            title:
              user.status === 'PENDING'
                ? 'Your application is still under review.'
                : 'Your application was not accepted.',
          });
          router.replace('/status');
          return;
        }
        setState('ready');
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
  }, [router, setSession, pushToast]);

  return state;
}
