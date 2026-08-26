'use client';

/**
 * Inline check (formative mini quiz). SECURITY: the client NEVER has
 * `correctIndex`/`explanation` — selection is graded by
 * POST /api/learn/lessons/:id/check, which reveals the answer only after submit.
 */
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { apiFetch } from '@reka-bytes/shared';
import type { StudentInlineCheckBlock, StudentLessonBlock } from '@reka-bytes/shared';

interface CheckResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  /** PRD-03 §2 — true when this attempt completed the lesson server-side. */
  lessonCompleted?: boolean;
}

export function InlineCheckBlockView({
  block: rawBlock,
  lessonId,
  blockIndex,
  onLessonCompleted,
}: {
  /** Registry passes the generic union; this view narrows it. */
  block: StudentLessonBlock;
  lessonId: string;
  blockIndex: number;
  onLessonCompleted?: () => void;
}) {
  if (rawBlock.type !== 'inline-check') {
    return (
      <div data-testid="unsupported-block" className="rounded-panel border border-dashed border-line bg-inset px-5 py-4">
        <p className="font-mono text-xs text-faint">// mis-typed block</p>
      </div>
    );
  }
  const block: StudentInlineCheckBlock = rawBlock;
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (selected === null || checking || result) return;
    setChecking(true);
    setError(null);
    try {
      const res = await apiFetch<CheckResult>(`/api/learn/lessons/${lessonId}/check`, {
        method: 'POST',
        body: { blockIndex, answer: selected },
      });
      setResult(res);
      if (res.lessonCompleted) onLessonCompleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check answer');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section data-testid="inline-check-block" className="rounded-card border border-line bg-elevated p-5 shadow-card">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
        // quick check
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{block.question}</p>

      <div className="mt-4 space-y-2">
        {block.options.map((option, i) => {
          const isSelected = selected === i;
          const isChosenAnswer = result && selected === i;
          const isCorrectAnswer = result && result.correctIndex === i;

          let optionClass = 'border-line hover:border-line-strong';
          if (result) {
            if (isCorrectAnswer) optionClass = 'border-success bg-success/10';
            else if (isChosenAnswer) optionClass = 'border-danger bg-danger/10';
            else optionClass = 'border-line opacity-50';
          } else if (isSelected) {
            optionClass = 'border-accent bg-accent/10';
          }

          return (
            <button
              key={i}
              type="button"
              disabled={!!result}
              onClick={() => setSelected(i)}
              className={`flex w-full items-center gap-3 rounded-panel border px-4 py-2.5 text-left text-sm transition-colors ${optionClass}`}
            >
              <span className="font-mono text-xs text-faint">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 text-ink">{option}</span>
              {isCorrectAnswer && <Check size={14} className="text-success" strokeWidth={3} />}
              {isChosenAnswer && result?.correctIndex !== i && (
                <X size={14} className="text-danger" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 font-mono text-xs text-danger">{error}</p>}

      {!result ? (
        <button
          type="button"
          onClick={submit}
          disabled={selected === null || checking}
          className="mt-4 rounded-full border border-line-strong px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-40"
        >
          {checking ? 'checking…' : 'check answer'}
        </button>
      ) : (
        <div
          className={`reveal-in mt-4 rounded-r-panel border-l-2 px-4 py-3 ${
            result.correct ? 'border-l-success bg-inset' : 'border-l-warning bg-inset'
          }`}
        >
          <p className={`font-mono text-xs font-bold uppercase tracking-[0.12em] ${result.correct ? 'text-success' : 'text-warning'}`}>
            {result.correct ? '✓ correct' : '✗ not quite'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{result.explanation}</p>
        </div>
      )}
    </section>
  );
}
