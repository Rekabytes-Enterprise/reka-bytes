'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Circle, PlayCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { StudentClassDTO } from '@reka-bytes/shared';
import { ModuleMap } from '@/components/student/module-map';
import { useApiQuery } from '@/hooks/api-query';

export default function LearnPage() {
  // Server state via useApiQuery (jotai atom); errors toast on failure.
  const { data: classes, loading } = useApiQuery<StudentClassDTO[]>('/api/learn/classes');

  if (loading || !classes) {
    return <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading classes…</p>;
  }
  if (classes.length === 0) {
    return (
      <div className="mt-10 border border-line bg-elevated p-12 text-center">
        <h2 className="font-display text-2xl font-semibold">No classes published yet</h2>
        <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-muted">
          Your instructors are preparing the material. It will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="learn-tree">
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">classroom</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Learn</h1>
      </header>

      {classes.map((cls) => (
        <ClassSection key={cls.id} cls={cls} />
      ))}
    </div>
  );
}

function ClassSection({ cls }: { cls: StudentClassDTO }) {
  const [openModule, setOpenModule] = useState<string | null>(cls.modules[0]?.id ?? null);

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold">{cls.title}</h2>
      {cls.description && (
        <p className="mt-1 max-w-2xl font-body text-sm text-muted">{cls.description}</p>
      )}

      <ModuleMap cls={cls} />

      <ul className="mt-8 border-t border-line">
        {cls.modules.map((mod) => {
          const done = mod.lessons.filter((l) => l.completedAt !== null).length;
          const open = openModule === mod.id;
          const nextLesson = mod.lessons.find((l) => l.completedAt === null);

          return (
            <li key={mod.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => setOpenModule(open ? null : mod.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-2 py-4 text-left transition-colors hover:bg-elevated"
              >
                <span className="flex items-center gap-3">
                  {open ? (
                    <ChevronDown size={16} className="text-accent" />
                  ) : (
                    <ChevronRight size={16} className="text-faint" />
                  )}
                  <span className="font-body text-sm font-medium text-ink">{mod.title}</span>
                </span>
                <span className="font-mono text-xs text-faint">
                  {done}/{mod.lessons.length} ✓
                </span>
              </button>

              {open && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pb-2"
                >
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${lesson.id}`}
                        data-testid={`lesson-link-${lesson.id}`}
                        className="ml-9 flex items-center justify-between py-2.5 pr-2 transition-colors hover:text-accent"
                      >
                        <span className="flex items-center gap-3">
                          {lesson.completedAt ? (
                            <Check size={15} className="text-success" />
                          ) : lesson.id === nextLesson?.id ? (
                            <PlayCircle size={15} className="text-accent" />
                          ) : (
                            <Circle size={15} className="text-line-strong" />
                          )}
                          <span
                            className={`font-body text-sm ${lesson.completedAt ? 'text-muted' : 'text-ink'}`}
                          >
                            {lesson.title}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-faint">{lesson.durationMinutes} min</span>
                      </Link>
                    </li>
                  ))}
                </motion.ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
