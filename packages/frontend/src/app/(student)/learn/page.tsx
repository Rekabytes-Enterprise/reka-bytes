'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Circle, PlayCircle, ChevronDown } from 'lucide-react';
import type { StudentClassDTO, StudentModuleDTO } from '@reka-bytes/shared';
import { ModuleMap } from '@/components/student/module-map';
import { useApiQuery } from '@/hooks/api-query';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function LearnPage() {
  // Server state via useApiQuery (jotai atom); errors toast on failure.
  const { data: classes, loading } = useApiQuery<StudentClassDTO[]>('/api/learn/classes');

  if (loading || !classes) {
    return <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading classes…</p>;
  }
  if (classes.length === 0) {
    return (
      <Card className="mt-10 border-dashed p-12 text-center">
        <h2 className="font-display text-2xl font-semibold">No classes published yet</h2>
        <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-muted">
          Your instructors are preparing the material. It will appear here automatically.
        </p>
      </Card>
    );
  }

  return (
    <div data-testid="learn-tree">
      <header className="pb-8">
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

      <ul className="mt-8 space-y-4">
        {cls.modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} open={openModule === mod.id} onToggle={() => setOpenModule(openModule === mod.id ? null : mod.id)} />
        ))}
      </ul>
    </section>
  );
}

function ModuleCard({ mod, open, onToggle }: { mod: StudentModuleDTO; open: boolean; onToggle: () => void }) {
  const done = mod.lessons.filter((l) => l.completedAt !== null).length;
  const pct = mod.lessons.length === 0 ? 0 : Math.round((done / mod.lessons.length) * 100);
  const nextLesson = mod.lessons.find((l) => l.completedAt === null);
  const allDone = mod.lessons.length > 0 && done === mod.lessons.length;

  return (
    <li className="card-surface overflow-hidden" data-testid={`module-card-${mod.id}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`module-toggle-${mod.id}`}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('shrink-0 transition-transform duration-200', open ? 'rotate-180 text-accent' : 'text-faint')}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-body text-sm font-medium text-ink">{mod.title}</span>
            <span className="shrink-0 font-mono text-xs text-faint">
              {done}/{mod.lessons.length} ✓
            </span>
          </span>
          {/* Per-module progress rail */}
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-line/60" aria-hidden>
            <motion.span
              className={`block h-full rounded-full ${allDone ? 'bg-success' : 'bg-accent'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </span>
        </span>
      </button>

      {open && (
        <motion.ul
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden pb-3"
        >
          {mod.lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/learn/${lesson.id}`}
                data-testid={`lesson-link-${lesson.id}`}
                className={cn(
                  'mx-3 flex items-center justify-between rounded-panel px-3 py-2.5 pr-4 transition-colors',
                  'hover:bg-inset',
                )}
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
}
