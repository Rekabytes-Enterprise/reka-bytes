'use client';

/**
 * Graphical learning path (LESSON-PLAN §9.3) — pure presentational component
 * over StudentClassDTO. Modules are nodes on a vertical path, lessons are
 * dots. States: done / current (first incomplete) / upcoming — visual only,
 * NO gating logic.
 */
import Link from 'next/link';
import { Check } from 'lucide-react';
import type { StudentClassDTO } from '@reka-bytes/shared';

export function ModuleMap({ cls }: { cls: StudentClassDTO }) {
  // "Current" = first incomplete lesson across the whole class (in order).
  const currentLessonId =
    cls.modules.flatMap((m) => m.lessons).find((l) => l.completedAt === null)?.id ?? null;
  const totalLessons = cls.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalDone = cls.modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.completedAt !== null).length,
    0,
  );
  const currentModuleId =
    cls.modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))?.id ??
    // everything done → highlight last module
    cls.modules[cls.modules.length - 1]?.id;

  return (
    <div data-testid="module-map" className="mt-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        {totalDone}/{totalLessons} lessons complete ·{' '}
        {totalLessons === 0 ? 0 : Math.round((totalDone / totalLessons) * 100)}%
      </p>
      <ol className="relative mt-4 space-y-6 border-l border-line pl-6">
        {cls.modules.map((mod) => {
          const done = mod.lessons.filter((l) => l.completedAt !== null).length;
          const pct = mod.lessons.length === 0 ? 0 : Math.round((done / mod.lessons.length) * 100);
          const isComplete = done === mod.lessons.length && mod.lessons.length > 0;

          return (
            <li key={mod.id} className="relative">
              {/* Module node */}
              <span
                className={`absolute -left-[31px] flex h-4 w-4 items-center justify-center border ${
                  isComplete
                    ? 'border-success bg-success/20'
                    : mod.id === currentModuleId
                      ? 'border-accent bg-accent/20'
                      : 'border-line-strong bg-canvas'
                }`}
              >
                {isComplete && <Check size={10} strokeWidth={3} className="text-success" />}
              </span>

              <div className="flex items-baseline justify-between gap-3">
                <h4
                  className={`font-body text-sm font-medium ${
                    isComplete ? 'text-muted' : mod.id === currentModuleId ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {mod.title}
                </h4>
                <span className="shrink-0 font-mono text-[10px] text-faint">{pct}%</span>
              </div>

              {/* Lesson dots */}
              <ul className="mt-2 space-y-1.5 border-l border-dashed border-line pl-4">
                {mod.lessons.map((lesson) => {
                  const state = lesson.completedAt
                    ? 'done'
                    : lesson.id === currentLessonId
                      ? 'current'
                      : 'upcoming';
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${lesson.id}`}
                        data-testid={`map-lesson-${lesson.id}`}
                        className="group flex items-center gap-2.5"
                      >
                        <span
                          data-testid={`map-dot-${state}`}
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            state === 'done'
                              ? 'bg-success'
                              : state === 'current'
                                ? 'bg-accent ring-2 ring-accent/30'
                                : 'bg-line-strong group-hover:bg-faint'
                          }`}
                        />
                        <span
                          className={`font-body text-xs transition-colors ${
                            state === 'current'
                              ? 'font-medium text-ink group-hover:text-accent'
                              : 'text-muted group-hover:text-accent'
                          }`}
                        >
                          {lesson.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
