'use client';

import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage, useHydrateAtoms } from 'jotai/utils';

/**
 * AI Masterclass wizard state.
 *
 * Persisted to sessionStorage via `atomWithStorage` (`getOnInit: false` so
 * SSR is safe — the atom reads its default `null` until the WizardShell
 * explicitly hydrates). The hydration effect reads from sessionStorage once
 * and seeds the atoms via `useHydrateAtoms`. After that, every setter writes
 * straight through to storage.
 *
 * NOTE: We never init atom values at module scope. Atom-with-storage + the
 * hydration gate mean a hard refresh / direct URL entry on a wizard step still
 * picks up the in-flight jobId/classId without an SSR mismatch.
 */

const SS_JOB_KEY = 'rb-ai-job'; // string jobId
const SS_CLASS_KEY = 'rb-ai-class'; // string classId

// SSR-safe sessionStorage adapter — the factory is lazy and `getOnInit: false`
// keeps the synchronous read out of server rendering entirely.
const safeSession = createJSONStorage<string | null>(() =>
  typeof window === 'undefined' ? (undefined as never) : sessionStorage,
);

export const aiJobIdAtom = atomWithStorage<string | null>(SS_JOB_KEY, null, safeSession, {
  getOnInit: false,
});
export const aiClassIdAtom = atomWithStorage<string | null>(SS_CLASS_KEY, null, safeSession, {
  getOnInit: false,
});

// Title is ephemeral (no persistence — shown on step 3 only).
export const aiClassTitleAtom = atom<string | null>(null);

// Hydration flag gates step pages so they don't flash empty content.
export const aiHydratedAtom = atom(false);

/** One-shot hydration from sessionStorage. Call once in WizardShell. */
export function useAIWizardHydrate() {
  // Populates atoms synchronously during the first render. No-op on re-renders.
  useHydrateAtoms([
    [aiJobIdAtom, readPersisted(SS_JOB_KEY)],
    [aiClassIdAtom, readPersisted(SS_CLASS_KEY)],
  ]);

  // Flip the hydrated flag on the next tick so step pages can render safely.
  const setHydrated = useSetAtom(aiHydratedAtom);
  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);
}

/**
 * Read the DESERIALIZED value from sessionStorage — must mirror what
 * createJSONStorage wrote (JSON-encoded). Hydrating the raw string would
 * double-encode ("abc" → "\"abc\"") and make clear()'s "null" truthy.
 */
function readPersisted(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/** Read wizard state + hydrated flag. Setters just write the atom — persistence is automatic. */
export function useAIWizard() {
  const [jobId, setJobId] = useAtom(aiJobIdAtom);
  const [classId, setClassId] = useAtom(aiClassIdAtom);
  const [classTitle, setClassTitle] = useAtom(aiClassTitleAtom);
  const hydrated = useAtomValue(aiHydratedAtom);

  return {
    jobId,
    classId,
    classTitle,
    hydrated,
    setJobId(id: string | null) {
      setJobId(id);
    },
    setClassId(id: string | null) {
      setClassId(id);
    },
    setClassTitle(title: string | null) {
      setClassTitle(title);
    },
    clear() {
      setJobId(null);
      setClassId(null);
      setClassTitle(null);
    },
  };
}
