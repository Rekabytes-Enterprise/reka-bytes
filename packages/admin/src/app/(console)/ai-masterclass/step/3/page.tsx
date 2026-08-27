'use client';

import { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { atom } from 'jotai';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, Check, ChevronRight, Clock, PauseCircle, RefreshCw, X } from 'lucide-react';
import {
  apiFetch,
  isApiClientError,
  type AIOutlineDTO,
  type AIGenJobStatusDTO,
} from '@reka-bytes/shared';
import { WizardShell } from '@/components/ai/wizard-shell';
import { useAIWizard } from '@/components/ai/state';
import { usePushToast } from '@/components/system/toaster';
import { ElapsedTimer } from '@/components/ai/elapsed-timer';

/**
 * Step 3 — outline checkpoint. The pipeline is PAUSED (job status
 * `awaiting_approval`): the admin reviews the proposed outline and either
 * approves it (phase 2 — lesson writing — resumes) or regenerates it.
 *
 * State lives in Jotai atoms. Handlers are plain async functions.
 * One useEffect handles data fetching — the ONLY side effect that needs it.
 */

// ── Atoms ─────────────────────────────────────────────────────────────────

const jobAtom = atom<AIGenJobStatusDTO | null>(null);
const outlineAtom = atom<AIOutlineDTO | null>(null);
const errorAtom = atom<string | null>(null);
const approvingAtom = atom(false);
const regeneratingAtom = atom(false);
const outlineVersionAtom = atom(0); // bump to replay stagger animation
const pausedAtAtom = atom(Date.now()); // when we arrived on step 3

// Derived (read-only, no useState needed in component)
const failedAtom = atom((get) => get(jobAtom)?.status === 'error');
const totalLessonsAtom = atom((get) =>
  get(outlineAtom)?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0,
);
const totalMinutesAtom = atom((get) =>
  get(outlineAtom)?.modules.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + l.estimatedMinutes, 0),
    0,
  ) ?? 0,
);

// ── Component ─────────────────────────────────────────────────────────────

export default function Step3Page() {
  const router = useRouter();
  const wizard = useAIWizard();
  const pushToast = usePushToast();

  const [job, setJob] = useAtom(jobAtom);
  const [outline, setOutline] = useAtom(outlineAtom);
  const [error, setError] = useAtom(errorAtom);
  const [approving, setApproving] = useAtom(approvingAtom);
  const [regenerating, setRegenerating] = useAtom(regeneratingAtom);
  const [outlineVersion, setOutlineVersion] = useAtom(outlineVersionAtom);
  const [pausedAt] = useAtom(pausedAtAtom);
  const setPausedAt = useAtom(pausedAtAtom)[1];

  const failed = useAtomValue(failedAtom);
  const totalLessons = useAtomValue(totalLessonsAtom);
  const totalMinutes = useAtomValue(totalMinutesAtom);
  // Approve/regenerate are only meaningful when the job is actually waiting
  // for the admin to act. Without this guard, the `approving`/`regenerating`
  // flags (which can persist across React Router navigations within the same
  // tab) would lock the buttons even when the job has already moved on.
  const canInteract = !approving && !regenerating && job?.status === 'awaiting_approval';

  // ── Data fetch (the ONE useEffect) ─────────────────────────────────────
  // Depends ONLY on jobId (a primitive). The previous bug was depending on
  // the entire `wizard` object, which returned a new reference every render,
  // recreating the useCallback and re-triggering the effect infinitely.
  useEffect(() => {
    if (!wizard.hydrated || !wizard.jobId) return;

    let cancelled = false;

    // Reset any stale in-flight flags from a previous visit to step 3.
    // These atoms are module-scoped (Jotai singleton) and survive React
    // Router navigations within the tab — without this reset, a previous
    // click that never resolved (e.g. job expired) would lock the buttons
    // forever with no escape hatch (see PR for bug repro).
    setApproving(false);
    setRegenerating(false);

    apiFetch<AIGenJobStatusDTO>(`/api/admin/ai/masterclass/status/${wizard.jobId}`)
      .then((data) => {
        if (cancelled) return;
        setJob(data);
        if (data.outline) setOutline(data.outline);
        setError(null);
        if (data.status === 'awaiting_approval') setPausedAt(Date.now());
      })
      .catch((e) => {
        if (cancelled) return;
        setError(isApiClientError(e) ? e.message : 'Could not load the outline');
      });

    return () => {
      cancelled = true;
    };
  }, [wizard.jobId, setJob, setOutline, setError, setPausedAt, setApproving, setRegenerating]);

  // ── Redirect on status change ───────────────────────────────────────────
  useEffect(() => {
    if (!job) return;
    if (job.status === 'processing') router.replace('/ai-masterclass/step/2');
    else if (job.status === 'done' && job.classId) {
      wizard.setClassId(job.classId);
      router.replace('/ai-masterclass/step/4');
    }
  }, [job?.status, job?.classId, router, wizard]);

  // ── Guard: no jobId → redirect ──────────────────────────────────────────
  useEffect(() => {
    if (wizard.hydrated && !wizard.jobId) router.replace('/ai-masterclass/step/1');
  }, [wizard.hydrated, wizard.jobId, router]);

  if (!wizard.hydrated) return null;

  // ── Handlers (plain async functions, no useCallback) ───────────────────

  async function handleApprove() {
    if (!wizard.jobId || approving) return;
    setApproving(true);
    try {
      await apiFetch(`/api/admin/ai/masterclass/approve/${wizard.jobId}`, { method: 'POST' });
      router.push('/ai-masterclass/step/2');
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Approve failed' });
      setApproving(false);
    }
  }

  async function handleRegenerate() {
    if (!wizard.jobId || regenerating) return;
    setRegenerating(true);
    try {
      const { outline: next } = await apiFetch<{ outline: AIOutlineDTO }>(
        `/api/admin/ai/masterclass/regenerate-outline/${wizard.jobId}`,
        { method: 'POST' },
      );
      setOutline(next);
      setOutlineVersion((v) => v + 1); // replay stagger
      pushToast({ variant: 'success', title: 'New outline ready' });
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Regeneration failed' });
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <WizardShell step={3}>
      <div className="mx-auto max-w-[720px]">
        <div className="border border-line bg-elevated p-8">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-accent" data-testid="ai-outline-label">
              <PauseCircle size={13} className="mr-1.5 inline text-accent" aria-hidden />
              paused — review your outline
            </p>
            {!failed && job && <ElapsedTimer since={pausedAt} />}
          </div>
          <p className="mt-2 font-body text-sm text-muted">
            The AI analyzed your PDF and designed this course structure. Nothing is written yet —
            approve it to start the lessons, or ask for a different take.
          </p>

          {error && (
            <>
              <p className="mt-4 font-body text-sm text-danger">{error}</p>
              <button
                type="button"
                onClick={() => router.push('/ai-masterclass/step/1')}
                className="mt-4 border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
              >
                ← start over
              </button>
            </>
          )}

          {failed && (
            <>
              <p className="mt-4 font-body text-sm text-danger">{job?.error}</p>
              <button
                type="button"
                onClick={() => router.push('/ai-masterclass/step/1')}
                className="mt-4 border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
              >
                ← start over
              </button>
            </>
          )}

          {outline && !failed && (
            <>
              <p
                className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-faint"
                data-testid="ai-outline-summary"
              >
                <BookOpenText size={12} className="mr-1.5 inline text-accent" aria-hidden />
                {outline.modules.length} modules · {totalLessons} lessons · ~{Math.round(totalMinutes / 5) * 5} min
                of content
              </p>

              <ul className="mt-4 space-y-3" data-testid="ai-outline-panel">
                <AnimatePresence mode="popLayout" key={outlineVersion}>
                  {outline.modules.map((mod, i) => (
                    <motion.li
                      key={mod.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.09 }}
                      className="border border-line bg-inset p-5"
                      data-testid="ai-outline-module"
                    >
                      <p className="font-body text-sm font-semibold text-ink">{mod.title}</p>
                      {mod.description ? (
                        <p className="mt-1 font-body text-xs leading-relaxed text-muted">{mod.description}</p>
                      ) : null}
                      <ul className="mt-3 space-y-1.5">
                        {mod.lessons.map((lesson) => (
                          <li key={lesson.title} className="flex items-baseline gap-2 font-body text-xs text-muted">
                            <ChevronRight size={11} className="mt-[3px] shrink-0 text-faint" aria-hidden />
                            <span className="text-ink/90">{lesson.title}</span>
                            <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">
                              {lesson.estimatedMinutes} min
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!canInteract}
                  data-testid="ai-approve-btn"
                  className="bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover disabled:opacity-40"
                >
                  {approving ? (
                    'starting lessons…'
                  ) : (
                    <>
                      <Check size={13} className="mr-1.5 inline" aria-hidden />
                      looks good — write the lessons
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={!canInteract}
                  data-testid="ai-regen-outline-btn"
                  className="border border-line-strong px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  <RefreshCw
                    size={13}
                    className={`mr-1.5 inline ${regenerating ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                  {regenerating ? 'redesigning…' : 'regenerate outline'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/ai-masterclass/step/1')}
                  // "Start over" is the escape hatch — keep it clickable even
                  // when the job has already moved on, so the user is never
                  // stranded on this page.
                  disabled={approving || regenerating}
                  className="ml-auto border border-line-strong px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint hover:border-danger hover:text-danger disabled:opacity-40"
                >
                  <X size={13} className="mr-1.5 inline" aria-hidden />
                  start over
                </button>
              </div>
            </>
          )}
        </div>

        {!failed && (
          <p className="mt-4 flex items-center gap-1.5 font-mono text-xs text-faint">
            <Clock size={11} aria-hidden />
            approving resumes generation — lesson writing takes the longest
          </p>
        )}
      </div>
    </WizardShell>
  );
}
