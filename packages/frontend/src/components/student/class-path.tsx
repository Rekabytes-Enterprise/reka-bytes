'use client';

/**
 * ClassPath — THE single curriculum view for /learn (redesigned 2026-08).
 * Replaces the old ModuleMap + accordion-dropdown pair, which rendered the
 * same modules/lessons twice per class.
 *
 * Layout: each class is a section with its own head (title, description,
 * overall progress bar, continue CTA) followed by ONE learning path —
 * module cards strung along a vertical rail, every lesson an always-visible
 * pill row inside its card.
 *
 * Purely presentational over StudentClassDTO. States are derived:
 * done / current (first incomplete lesson across the class) / upcoming —
 * visual only, NO gating logic. Frozen testids (e2e-09/e2e-14):
 * `module-map`, `map-dot-done|current|upcoming`, `lesson-link-{lessonId}`.
 */
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { StudentClassDTO } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';

type LessonState = 'done' | 'current' | 'upcoming';

const DOT_CLS: Record<LessonState, string> = {
  done: 'bg-success',
  current: 'bg-accent ring-2 ring-accent/30',
  upcoming: 'bg-line-strong group-hover:bg-faint',
};

const TITLE_CLS: Record<LessonState, string> = {
  done: 'text-muted',
  current: 'font-medium text-ink',
  upcoming: 'text-ink',
};

const MODULE_NODE_CLS = {
  complete: 'border-success/60 bg-success/15 text-success',
  current: 'border-accent bg-accent/10 text-accent ring-4 ring-accent/15',
  upcoming: 'border-line-strong bg-canvas text-faint',
} as const;

const BADGE_CLS = {
  complete: 'bg-success/10 text-success',
  current: 'bg-accent/10 text-accent',
  upcoming: 'bg-inset text-muted ring-1 ring-line',
} as const;

export function ClassPath({ cls }: { cls: StudentClassDTO }) {
  const flatLessons = cls.modules.flatMap((m) => m.lessons);
  const totalLessons = flatLessons.length;
  const doneCount = flatLessons.filter((l) => l.completedAt !== null).length;
  const pct = totalLessons === 0 ? 0 : Math.round((doneCount / totalLessons) * 100);
  // "Current" = first incomplete lesson across the whole class (in order).
  const currentLessonId = flatLessons.find((l) => l.completedAt === null)?.id ?? null;
  const currentModuleId =
    cls.modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))?.id ??
    // everything done → highlight last module
    cls.modules[cls.modules.length - 1]?.id;
  const nextLesson = flatLessons.find((l) => l.completedAt === null);

  return (
    <section className="mt-12" aria-label={cls.title}>
      {/* ── Class head ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
            class
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">{cls.title}</h2>
          {cls.description && (
            <p className="mt-1 font-body text-sm leading-relaxed text-muted">{cls.description}</p>
          )}
        </div>

        {nextLesson ? (
          <Link
            href={`/learn/${nextLesson.id}`}
            className={cn(
              'shrink-0 rounded-full bg-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em]',
              'text-accent-ink shadow-lift transition-all hover:-translate-y-0.5 hover:bg-accent-hover',
            )}
          >
            continue →
          </Link>
        ) : (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full bg-success/10 px-5 py-2.5',
              'font-mono text-xs font-bold uppercase tracking-[0.12em] text-success',
            )}
          >
            <Check size={14} strokeWidth={3} aria-hidden />
            all complete
          </span>
        )}
      </div>

      {/* Overall progress rail */}
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        {doneCount}/{totalLessons} lessons complete · {pct}%
      </p>
      <span
        aria-hidden
        className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-inset ring-1 ring-line/60"
      >
        <motion.span
          className={cn(
            'block h-full rounded-full',
            doneCount === totalLessons && totalLessons > 0 ? 'bg-success' : 'bg-accent',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </span>

      {/* ── Learning path — modules along the rail ─────────────── */}
      {cls.modules.length === 0 ? (
        <p className="mt-8 font-mono text-xs text-faint">// no modules published yet</p>
      ) : (
        <ol
          data-testid="module-map"
          className="relative ml-3 mt-4 space-y-5 border-l border-line pb-2 pl-7 pt-6"
        >
          {cls.modules.map((mod, i) => {
            const modDone = mod.lessons.filter((l) => l.completedAt !== null).length;
            const modTotal = mod.lessons.length;
            const modPct = modTotal === 0 ? 0 : Math.round((modDone / modTotal) * 100);
            const isComplete = modTotal > 0 && modDone === modTotal;
            const state = isComplete
              ? 'complete'
              : mod.id === currentModuleId
                ? 'current'
                : 'upcoming';

            return (
              <li
                key={mod.id}
                className="relative reveal-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Rail node */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute -left-[45px] top-3 flex size-8 items-center justify-center rounded-full border font-mono text-[11px] font-bold',
                    MODULE_NODE_CLS[state],
                  )}
                >
                  {isComplete ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>

                <div className="card-surface p-5" data-testid={`module-panel-${mod.id}`}>
                  {/* Module header */}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="min-w-0 truncate font-body text-base font-medium">
                      <span className="mr-3 font-mono text-xs font-bold text-faint">
                        {String(i + 1).padStart(2, '0')} /
                      </span>
                      {mod.title}
                    </h3>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]',
                          BADGE_CLS[state],
                        )}
                      >
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        {isComplete ? 'complete' : state === 'current' ? 'in progress' : 'up next'}
                      </span>
                      <span className="font-mono text-xs text-faint">
                        {modDone}/{modTotal} · {modPct}%
                      </span>
                    </div>
                  </div>

                  {/* Lessons — always visible */}
                  {modTotal === 0 ? (
                    <p className="mt-4 font-mono text-xs text-faint">// no lessons published yet</p>
                  ) : (
                    <ul className="mt-4 space-y-1.5">
                      {mod.lessons.map((lesson) => {
                        const lessonState: LessonState = lesson.completedAt
                          ? 'done'
                          : lesson.id === currentLessonId
                            ? 'current'
                            : 'upcoming';
                        return (
                          <li key={lesson.id}>
                            <Link
                              href={`/learn/${lesson.id}`}
                              data-testid={`lesson-link-${lesson.id}`}
                              className={cn(
                                'group flex items-center justify-between gap-3 rounded-input px-3 py-2.5 transition-colors',
                                lessonState === 'current'
                                  ? 'bg-accent/[0.07] ring-1 ring-accent/25 hover:bg-accent/[0.12]'
                                  : 'hover:bg-inset',
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span
                                  aria-hidden
                                  data-testid={`map-dot-${lessonState}`}
                                  className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    DOT_CLS[lessonState],
                                  )}
                                />
                                <span
                                  className={cn(
                                    'truncate font-body text-sm',
                                    TITLE_CLS[lessonState],
                                  )}
                                >
                                  {lesson.title}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2.5">
                                {lessonState === 'current' && (
                                  <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent-ink">
                                    resume
                                  </span>
                                )}
                                <span className="font-mono text-xs text-faint">
                                  {lesson.durationMinutes} min
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}

                      {/* Module quiz — quiet tail row when the module carries one */}
                      {mod.quiz && (
                        <li>
                          <Link
                            href={`/learn/quiz/${mod.quiz.id}`}
                            data-testid={`quiz-link-${mod.quiz.id}`}
                            className="flex items-center justify-between gap-3 rounded-input border border-dashed border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-inset"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span aria-hidden className="font-mono text-[10px] text-faint">
                                ?
                              </span>
                              <span className="truncate font-body text-sm text-muted">
                                {mod.quiz.title}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs text-faint">
                              {mod.quiz.questionCount} q · pass {mod.quiz.passingScore}%
                            </span>
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
