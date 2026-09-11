'use client';

/**
 * Jotai-powered async query hook (frontend).
 *
 * Design:
 * - The query state lives in a plain writable atom (`QueryResult` union:
 *   loading | hasData | hasError) whose `onMount` runs the fetch. `onMount`
 *   is a core jotai API — no deprecated `loadable`, no suspense, no
 *   useEffect-for-fetching.
 * - The atom is memoized on `[path, skip, refresh]`. Recreating it = fresh
 *   subscription = `onMount` fires again, which cleanly covers both
 *   "id changed → refetch" and manual `reload()`.
 * - Errors auto-toast via formatApiError (code/status/details surfaced); opt
 *   out with `toastError: false`. Extra handling goes through `onError`.
 * - Auth redirects stay in the guard hooks — pages decide their own behaviour
 *   via `onError` (e.g. 401 → router.replace('/login')).
 */
import { atom, useAtomValue, type Atom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, formatApiError } from '@reka-bytes/shared';
import { usePushToast } from '@/components/system/toaster';

export interface UseApiQueryOptions {
  /** Skip the fetch entirely (conditional queries). */
  skip?: boolean;
  /** Suppress the automatic error toast. Default: true. */
  toastError?: boolean;
  /** Extra error handler — runs after the toast. */
  onError?: (error: Error) => void;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Trigger a refetch. */
  reload: () => void;
}

type QueryResult<T> =
  { state: 'loading' } | { state: 'hasData'; data: T | null } | { state: 'hasError'; error: Error };

/**
 * Userland replacement for jotai's deprecated `loadable` (removed in v3).
 * A writable atom seeded with `loading`; `onMount` performs the fetch and
 * writes the settled result. The cleanup cancels stale writes on unmount.
 */
function createQueryAtom<T>(path: string | null, skip: boolean): Atom<QueryResult<T>> {
  const stateAtom = atom<QueryResult<T>>({ state: 'loading' });
  stateAtom.onMount = (setAtom) => {
    let cancelled = false;
    void (async () => {
      if (skip || !path) {
        setAtom({ state: 'hasData', data: null });
        return;
      }
      try {
        const data = await apiFetch<T>(path);
        if (!cancelled) setAtom({ state: 'hasData', data });
      } catch (e) {
        if (!cancelled) {
          setAtom({
            state: 'hasError',
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  };
  return stateAtom;
}

export function useApiQuery<T>(
  path: string | null,
  { skip = false, toastError = true, onError }: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const pushToast = usePushToast();
  const [refresh, setRefresh] = useState(0);

  // Keep the latest onError without making the effect depend on it (avoids
  // stale closures AND re-firing when callers pass inline handlers).
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stateAtom = useMemo(() => createQueryAtom<T>(path, skip), [path, skip, refresh]);
  const result = useAtomValue(stateAtom);

  const data = result.state === 'hasData' ? result.data : null;
  const error = result.state === 'hasError' ? result.error : null;
  const loading = result.state === 'loading';

  useEffect(() => {
    if (!error) return;
    if (toastError) {
      const { title, description } = formatApiError(error);
      pushToast({ variant: 'error', title, description });
    }
    onErrorRef.current?.(error);
  }, [error, toastError, pushToast]);

  const reload = useCallback(() => setRefresh((n) => n + 1), []);

  return { data, loading, error, reload };
}
