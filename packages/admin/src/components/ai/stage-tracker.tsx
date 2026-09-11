'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * Pipeline stage tracker for the generation screen. Stages are DERIVED from
 * the job's progress lines (same strings the backend appends) — no extra
 * backend state needed. If backend wording changes, update PATTERNS here.
 */

export interface StageView {
  id: string;
  label: string;
  state: 'done' | 'active' | 'pending';
  /** e.g. "3/6" for the write stage. */
  sub?: string;
}

interface StageSignals {
  extract: boolean; // active
  extractDone: boolean;
  analyze: boolean;
  analyzeDone: boolean;
  outline: boolean;
  outlineDone: boolean;
  write: boolean;
  writeSub?: string;
  writeDone: boolean;
  quiz: boolean;
  quizDone: boolean;
}

function signalsFrom(progress: string[]): StageSignals {
  const has = (prefix: string) => progress.some((l) => l.startsWith(prefix));
  const lessonMatch = [...progress]
    .reverse()
    .find((l) => l.startsWith('Wrote lesson '))
    ?.match(/^Wrote lesson (\d+)\/(\d+)/);

  const mock = has('Mock mode');
  return {
    extract: has('Extracting text'),
    extractDone: has('Extracted') || mock,
    analyze: has('Analyzing the material'),
    analyzeDone: has('Analysis done') || mock,
    outline: has('Designing the course outline') || has('Regenerating the course outline'),
    outlineDone: has('Outline ready') || has('New outline ready') || mock,
    write: has('Approved — writing lessons') || Boolean(lessonMatch),
    writeSub: lessonMatch ? `${lessonMatch[1]}/${lessonMatch[2]}` : undefined,
    writeDone: has('Writing class to database') || has('Generating quiz'),
    quiz: has('Generating quiz'),
    quizDone: has('Writing class to database'),
  };
}

/** Map progress lines → the five pipeline stages with done/active/pending. */
export function deriveStages(progress: string[]): StageView[] {
  const s = signalsFrom(progress);
  const defs: Array<{ id: string; label: string; active: boolean; done: boolean; sub?: string }> = [
    { id: 'extract', label: 'Extract', active: s.extract, done: s.extractDone },
    { id: 'analyze', label: 'Analyze', active: s.analyze, done: s.analyzeDone },
    { id: 'outline', label: 'Outline', active: s.outline, done: s.outlineDone },
    { id: 'write', label: 'Write', active: s.write, done: s.writeDone, sub: s.writeSub },
    { id: 'quiz', label: 'Quizzes', active: s.quiz, done: s.quizDone },
  ];
  // Everything before the furthest active/done stage is done; after → pending.
  const lastReached = defs.reduce((acc, d, i) => (d.active || d.done ? i : acc), -1);
  return defs.map((d, i) => ({
    id: d.id,
    label: d.label,
    sub: d.sub,
    state: d.done || i < lastReached ? 'done' : i === lastReached ? 'active' : 'pending',
  }));
}

/** 0..1 overall completion across the five stages (for the segmented bar). */
export function stageProgress(stages: StageView[]): number {
  const done = stages.filter((s) => s.state === 'done').length;
  const active = stages.some((s) => s.state === 'active') ? 0.5 : 0;
  return Math.min(1, (done + active) / stages.length);
}

const nodeVariants = {
  pending: { borderColor: 'var(--color-line)', color: 'var(--color-faint)' },
  active: {
    borderColor: 'var(--color-accent)',
    color: 'var(--color-accent)',
    transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 1.1 },
  },
  done: { borderColor: 'var(--color-success)', color: 'var(--color-success)' },
};

export function StageTracker({ stages }: { stages: StageView[] }) {
  return (
    <div
      className="flex items-center gap-0"
      role="status"
      aria-label="Pipeline stages"
      data-testid="ai-stage-tracker"
    >
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex flex-1 items-center last:flex-none">
          <motion.div
            className={`flex items-center gap-1.5 whitespace-nowrap border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
              stage.state === 'active'
                ? 'bg-accent/10'
                : stage.state === 'done'
                  ? 'bg-success/5'
                  : 'bg-transparent'
            }`}
            variants={nodeVariants}
            initial={false}
            animate={stage.state}
            data-testid={`ai-stage-${stage.id}`}
            data-state={stage.state}
          >
            <AnimatePresence mode="wait" initial={false}>
              {stage.state === 'done' ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <Check size={11} aria-hidden />
                </motion.span>
              ) : stage.state === 'active' ? (
                <motion.span
                  key="dot"
                  className="inline-block size-[6px] rounded-full bg-accent"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
              ) : (
                <span
                  key="ring"
                  className="inline-block size-[6px] rounded-full border border-current"
                />
              )}
            </AnimatePresence>
            {stage.label}
            {stage.sub ? <span className="text-accent">{stage.sub}</span> : null}
          </motion.div>
          {i < stages.length - 1 ? (
            <div className="relative mx-1 h-px flex-1 overflow-hidden bg-line">
              <motion.div
                className="absolute inset-y-0 left-0 bg-success"
                initial={false}
                animate={{ width: stage.state === 'done' ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Segmented progress bar — one segment per pipeline stage. Done segments fill
 * solid; the active segment carries an endless shimmer sweep so the wait never
 * looks frozen.
 */
export function SegmentedBar({ stages }: { stages: StageView[] }) {
  return (
    <div className="flex gap-1" data-testid="ai-progress-bar">
      {stages.map((stage) => (
        <div key={stage.id} className="relative h-2 flex-1 overflow-hidden bg-inset">
          {stage.state === 'done' ? (
            <motion.div
              className="h-full bg-accent"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.4 }}
            />
          ) : stage.state === 'active' ? (
            <div className="h-full w-full bg-accent/25">
              <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
