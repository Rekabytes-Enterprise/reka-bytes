'use client';

/**
 * Analytics (PRD-03 §3.4). Class picker → lesson completion bars +
 * inline-check heatmap (% correct per knowledge check — the "which concepts
 * teach badly" signal) + per-quiz-question stats.
 */
import { useState } from 'react';
import type { AnalyticsClassDetailDTO, AnalyticsClassListItemDTO } from '@reka-bytes/shared';
import { useAdminQuery } from '@/hooks/api-query';

function heatColor(percent: number | null): string {
  if (percent == null) return 'border-line bg-inset text-faint';
  if (percent >= 80) return 'border-success bg-success/15 text-success';
  if (percent >= 50) return 'border-warning bg-warning/15 text-warning';
  return 'border-danger bg-danger/15 text-danger';
}

export default function AnalyticsPage() {
  const [classId, setClassId] = useState<string | null>(null);

  const { data: classes, loading: classesLoading } = useAdminQuery<AnalyticsClassListItemDTO[]>(
    '/api/admin/analytics/classes',
  );

  // Auto-select first published class — derived, not an effect.
  const effectiveClassId =
    classId ?? classes?.find((c) => c.published)?.id ?? classes?.[0]?.id ?? null;

  // Detail refetches automatically because the atom is keyed on the path.
  const { data: detail, loading: detailLoading } = useAdminQuery<AnalyticsClassDetailDTO>(
    effectiveClassId ? `/api/admin/analytics/class/${effectiveClassId}` : null,
  );

  return (
    <main>
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          reka·bytes / admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Analytics</h1>
      </header>

      {classesLoading ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading classes…
        </p>
      ) : !classes ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // failed to load analytics
        </p>
      ) : (
        <>
          {/* Class picker */}
          <div className="mt-8 flex flex-wrap gap-2" data-testid="analytics-class-picker">
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClassId(c.id)}
                className={`border px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                  classId === c.id
                    ? 'border-accent bg-elevated text-accent'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <span className="block font-bold uppercase tracking-[0.12em]">{c.title}</span>
                <span className="text-[10px] text-faint">
                  {c.lessonCount} lessons · {c.completionCount} completions ·{' '}
                  {c.published ? 'published' : 'draft'}
                </span>
              </button>
            ))}
          </div>

          {detailLoading || detail === null ? (
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
              // loading class…
            </p>
          ) : (
            <div className="mt-10 space-y-12" data-testid="analytics-detail">
              {/* Lesson completion */}
              <section>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-faint">
                  lesson completion
                </h2>
                <ul className="mt-4 space-y-2">
                  {detail.lessons.map((l) => (
                    <li key={l.lessonId} className="flex items-center gap-4">
                      <span className="w-64 shrink-0 truncate font-body text-sm text-ink">
                        {l.lessonTitle}
                      </span>
                      <div className="h-3 flex-1 border border-line bg-inset">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.min(100, l.completedCount * 10)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-xs text-muted">
                        {l.completedCount}
                      </span>
                    </li>
                  ))}
                  {detail.lessons.length === 0 && (
                    <li className="font-mono text-xs text-faint">// no lessons</li>
                  )}
                </ul>
              </section>

              {/* Inline-check heatmap */}
              <section>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-faint">
                  knowledge check difficulty — % correct per check
                </h2>
                <p className="mt-1 font-mono text-[10px] text-faint">
                  red = most students get it wrong → the concept probably needs a better explanation
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.lessons.flatMap((l) =>
                    l.checks.map((c) => (
                      <div
                        key={`${c.lessonId}:${c.blockIndex}`}
                        className={`border p-4 ${heatColor(c.percentCorrect)}`}
                        data-testid="check-heat-cell"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                          {c.lessonTitle} · check #{c.blockIndex + 1}
                        </p>
                        <p className="mt-2 line-clamp-2 font-body text-xs text-ink">{c.question}</p>
                        <p className="mt-2 font-display text-2xl font-semibold">
                          {c.percentCorrect != null ? `${c.percentCorrect}%` : '—'}
                        </p>
                        <p className="font-mono text-[10px] text-faint">
                          {c.correctCount}/{c.attempts} correct
                        </p>
                      </div>
                    )),
                  )}
                  {detail.lessons.every((l) => l.checks.length === 0) && (
                    <p className="font-mono text-xs text-faint">
                      // no knowledge checks in this class
                    </p>
                  )}
                </div>
              </section>

              {/* Quiz question stats */}
              <section>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-faint">
                  quiz question stats
                </h2>
                <ul className="mt-4 space-y-2">
                  {detail.quizQuestions.length === 0 && (
                    <li className="font-mono text-xs text-faint">// no quizzes</li>
                  )}
                  {detail.quizQuestions.map((q) => (
                    <li
                      key={q.questionId}
                      className="flex items-center justify-between gap-4 border border-line px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm text-ink">{q.question}</p>
                        <p className="font-mono text-[10px] text-faint">
                          {q.quizTitle} · {q.attempts} attempts
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-sm font-bold ${heatColor(q.percentCorrect).includes('success') ? 'text-success' : heatColor(q.percentCorrect).includes('warning') ? 'text-warning' : heatColor(q.percentCorrect).includes('danger') ? 'text-danger' : 'text-faint'}`}
                      >
                        {q.percentCorrect != null ? `${q.percentCorrect}%` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}
