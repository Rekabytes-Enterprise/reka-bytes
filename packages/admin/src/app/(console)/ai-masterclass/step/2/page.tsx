'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Sparkles, X } from 'lucide-react';
import { apiFetch, type AIGenJobStatusDTO } from '@reka-bytes/shared';
import { WizardShell } from '@/components/ai/wizard-shell';
import { useAIWizard } from '@/components/ai/state';
import { deriveStages, SegmentedBar, StageTracker } from '@/components/ai/stage-tracker';
import { TypewriterLine } from '@/components/ai/typewriter';
import { ElapsedTimer } from '@/components/ai/elapsed-timer';
import { AnalysisPanel } from '@/components/ai/analysis-panel';

const POLL_MS = 2000;
// No poll cap: reasoning-model segments can legitimately run 15–40+ min, and
// the job lives server-side (Redis, 2h TTL) regardless of what this tab does.
// We only stop polling when the job looks dead (repeated status failures).
const MAX_CONSECUTIVE_ERRORS = 5; // expired job → 404s forever; surface instead

export default function Step2Page() {
  const router = useRouter();
  const wizard = useAIWizard();
  const [job, setJob] = useState<AIGenJobStatusDTO | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  // refs so the poll loop reads fresh state without re-running the effect
  const errorsRef = useRef(0);
  const stoppedRef = useRef(false);

  const stop = () => {
    stoppedRef.current = true;
  };

  const poll = useCallback(async () => {
    if (stoppedRef.current || !wizard.jobId) return;
    try {
      const data = await apiFetch<AIGenJobStatusDTO>(
        `/api/admin/ai/masterclass/status/${wizard.jobId}`,
      );
      if (stoppedRef.current) return;
      errorsRef.current = 0;
      setJob(data);
      if (data.status === 'awaiting_approval') {
        router.push('/ai-masterclass/step/3'); // outline checkpoint
        return;
      }
      if (data.status === 'done' && data.classId) {
        wizard.setClassId(data.classId);
        router.push('/ai-masterclass/step/4');
        return;
      }
      if (data.status === 'error') return; // stop — show error state
      setTimeout(() => void poll(), POLL_MS);
    } catch {
      if (stoppedRef.current) return;
      errorsRef.current += 1;
      if (errorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        stop();
        setLost('Lost contact with the job — it may have expired (jobs live 2 hours).');
        return;
      }
      setTimeout(() => void poll(), POLL_MS); // transient failure — retry
    }
  }, [wizard.jobId, router]);

  useEffect(() => {
    if (!wizard.hydrated) return;
    if (!wizard.jobId) {
      router.replace('/ai-masterclass/step/1');
      return;
    }
    stoppedRef.current = false;
    startedAt.current = Date.now();
    void poll();
    return stop;
  }, [wizard.hydrated, wizard.jobId, router, poll]);

  function checkAgain() {
    setLost(null);
    errorsRef.current = 0;
    stoppedRef.current = false;
    startedAt.current = Date.now();
    void poll();
  }

  const failed = job?.status === 'error';
  const stuck = lost !== null;
  const stages = deriveStages(job?.progress ?? []);
  const progress = job?.progress ?? ['queued…'];
  const latest = progress[progress.length - 1] ?? 'queued…';
  const history = progress.slice(0, -1);

  return (
    <WizardShell step={2}>
      <div className="mx-auto max-w-[720px]">
        <div className="border border-line bg-elevated p-8">
          <div className="flex items-center justify-between">
            <p
              className="font-mono text-xs uppercase tracking-[0.12em] text-faint"
              data-testid="ai-status-label"
            >
              {failed ? (
                'generation failed'
              ) : stuck ? (
                <>
                  <Clock size={12} className="mr-1.5 inline text-danger" aria-hidden />
                  connection lost
                </>
              ) : (
                <>
                  <motion.span
                    className="mr-1.5 inline-flex text-accent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                  >
                    <Sparkles size={12} aria-hidden />
                  </motion.span>
                  generating your curriculum…
                </>
              )}
            </p>
            {!failed && !stuck && <ElapsedTimer since={startedAt.current} />}
          </div>

          {/* Pipeline stage tracker + segmented shimmer bar */}
          {!failed && !stuck && (
            <div className="mt-5">
              <StageTracker stages={stages} />
              <div className="mt-4">
                <SegmentedBar stages={stages} />
              </div>
            </div>
          )}

          {failed && (
            <div className="mt-4 h-2 w-full bg-inset" data-testid="ai-progress-bar">
              <motion.div
                className="h-full bg-danger"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
              />
            </div>
          )}

          {/* Fixed-height terminal — log grows but stays in a scroll box */}
          <div
            ref={(el) => {
              // pin to bottom whenever the log changes
              if (el) el.scrollTop = el.scrollHeight;
            }}
            className="mt-6 max-h-56 overflow-y-auto border border-line bg-inset px-4 py-3"
            data-testid="ai-progress-log"
          >
            <ul className="space-y-2 font-mono text-xs text-muted">
              <AnimatePresence initial={false}>
                {history.map((line, i) => (
                  <motion.li
                    key={`${i}-${line}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                  >
                    <span className="mr-1.5 inline text-success">✓</span>
                    {line}
                  </motion.li>
                ))}
              </AnimatePresence>
              <li className={failed ? 'text-danger' : 'text-ink'}>
                {failed ? (
                  <>
                    <X size={12} className="mr-1.5 inline" aria-hidden />
                    {latest}
                  </>
                ) : (
                  <TypewriterLine text={latest} busy={!failed && !stuck} />
                )}
              </li>
            </ul>
          </div>

          {job?.analysis && <AnalysisPanel analysis={job.analysis} defaultOpen={false} />}

          {failed && (
            <>
              <p className="mt-4 font-body text-sm text-danger">{job?.error}</p>
              <button
                type="button"
                onClick={() => router.push('/ai-masterclass/step/1')}
                data-testid="ai-retry-btn"
                className="mt-4 border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
              >
                ← start over
              </button>
            </>
          )}

          {stuck && (
            <>
              <p className="mt-4 font-body text-sm text-danger">{lost}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={checkAgain}
                  className="border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
                >
                  check again
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/ai-masterclass/step/1')}
                  className="border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
                >
                  ← start over
                </button>
              </div>
            </>
          )}
        </div>

        {!failed && !stuck && (
          <p className="mt-4 font-mono text-xs text-faint">
            The AI reads your PDF, designs an outline for you to approve, then writes the lessons.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
