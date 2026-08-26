'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  apiFetch,
  isApiClientError,
  type PublicQuizDTO,
  type QuizSubmitResultDTO,
} from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/hooks/api-query';
import { fireConfetti, showXpToast } from '@/lib/celebrations';

type Phase = 'taking' | 'submitting' | 'results';

export function QuizRunner({ quizId }: { quizId: string }) {
  const [phase, setPhase] = useState<Phase>('taking');
  const [result, setResult] = useState<QuizSubmitResultDTO | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Server state via useApiQuery (jotai atom); suppress toast so the inline error UI keeps its slot.
  const { data: quiz } = useApiQuery<PublicQuizDTO>(`/api/learn/quizzes/${quizId}`, {
    toastError: false,
    onError: (e) => setError(isApiClientError(e) ? e.message : 'Failed to load quiz'),
  });

  // Reset local quiz state when a new quiz arrives.
  useEffect(() => {
    if (!quiz) return;
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setCurrent(0);
    setResult(null);
    setError(null);
    setPhase('taking');
  }, [quiz]);

  async function submit() {
    if (!quiz) return;
    setPhase('submitting');
    try {
      const res = await apiFetch<QuizSubmitResultDTO>(`/api/learn/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: ({ answers }),
        headers: { 'Content-Type': 'application/json' },
      });
      setResult(res);
      setPhase('results');
      if (res.passed) {
        void fireConfetti();
        showXpToast(res.score === 100 ? 150 : 100, { celebrate: true, label: 'quiz' });
      }
    } catch (e) {
      if (isApiClientError(e)) setError(e.message);
      setPhase('taking');
    }
  }

  if (error && !quiz) {
    return (
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-danger">{error}</p>
        <Link href="/learn" className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline">
          ← back to learn
        </Link>
      </div>
    );
  }
  if (!quiz) {
    return <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading quiz…</p>;
  }

  // ── Results ──
  if (phase === 'results' && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          data-testid={result.passed ? 'quiz-pass-banner' : 'quiz-fail-banner'}
          className={cn(
            'rounded-card border p-8 text-center shadow-card',
            result.passed
              ? 'border-success/50 bg-elevated'
              : 'border-danger/50 bg-elevated',
          )}
        >
          <p className={cn('font-display text-5xl font-semibold', result.passed ? 'text-success' : 'text-danger')}>
            {result.score}%
          </p>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-muted">
            {result.passed ? `passed — threshold ${quiz.passingScore}%` : `not passed — you need ${quiz.passingScore}%`}
          </p>
        </div>

        <ul className="mt-8 space-y-4" data-testid="quiz-results-breakdown">
          {result.results.map((r, i) => (
            <li key={r.questionId} className="card-surface rounded-panel p-5">
              <p className="font-body text-sm font-medium text-ink">
                Q{i + 1}. {r.question}
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                your answer:{' '}
                <span className={r.correct ? 'text-success' : 'text-danger'}>
                  {r.options[r.userAnswer] ?? '—'}
                </span>
              </p>
              {!r.correct && (
                <p className="mt-1 font-mono text-xs text-muted">
                  correct: <span className="text-success">{r.options[r.correctAnswer]}</span>
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (!quiz) return;
              setAnswers(new Array(quiz.questions.length).fill(-1));
              setCurrent(0);
              setResult(null);
              setError(null);
              setPhase('taking');
            }}
            data-testid="quiz-retry"
            className="rounded-full bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover"
          >
            try again
          </button>
          <Link
            href="/learn"
            className="rounded-full border border-line-strong px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-ink"
          >
            back to learn
          </Link>
        </div>
      </div>
    );
  }

  // ── Taking the quiz (one question at a time) ──
  const q = quiz.questions[current];
  if (!q) return null;
  const last = current === quiz.questions.length - 1;

  return (
    <div className="mx-auto max-w-2xl" data-testid="quiz-runner">
      <header className="flex items-center justify-between border-b border-line pb-6">
        <h1 className="font-display text-2xl font-semibold">{quiz.title}</h1>
        <span className="font-mono text-xs text-faint">pass at {quiz.passingScore}%</span>
      </header>

      {error && <p className="mt-4 font-mono text-xs text-danger">{error}</p>}

      <motion.div key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-accent-dim">
          question {current + 1} of {quiz.questions.length}
        </p>
        <h2 className="mt-3 font-body text-lg leading-relaxed text-ink">{q.question}</h2>

        <ul className="mt-6 space-y-2">
          {q.options.map((opt, i) => {
            const selected = answers[current] === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  data-testid={`quiz-option-${current}-${i}`}
                  aria-pressed={selected}
                  onClick={() =>
                    setAnswers((prev) => prev.map((a, idx) => (idx === current ? i : a)))
                  }
                  className={cn(
                    'w-full rounded-panel border px-5 py-4 text-left font-body text-sm transition-colors',
                    selected
                      ? 'border-accent bg-elevated text-accent'
                      : 'border-line text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span className="mr-3 font-mono text-xs text-faint">
                    {String.fromCharCode(65 + i)})
                  </span>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            data-testid="quiz-prev"
            className="rounded-full border border-line px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-30"
          >
            ← previous
          </button>
          {last ? (
            <button
              type="button"
              disabled={answers.some((a) => a < 0)}              onClick={submit}
              data-testid="quiz-submit"
              className="rounded-full bg-accent px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-all hover:-translate-y-0.5 hover:bg-accent-hover disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === 'submitting' ? 'submitting…' : 'submit quiz'}
            </button>
          ) : (
            <button
              type="button"
              disabled={(answers[current] ?? -1) < 0}
              onClick={() => setCurrent((c) => Math.min(quiz.questions.length - 1, c + 1))}
              data-testid="quiz-next"
              className="rounded-full border border-line-strong bg-elevated px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-30"
            >
              next →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
