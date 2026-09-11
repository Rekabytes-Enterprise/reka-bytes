'use client';

import { Check } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { aiClassTitleAtom, useAIWizardHydrate } from '@/components/ai/state';
import { useAtomValue } from 'jotai';

const STEPS = ['Upload', 'Generate', 'Outline', 'Review', 'Publish'] as const;

/**
 * Shared wizard chrome: guard + jotai hydration + header + step rail.
 * Renders null until the admin guard is ready and atoms are hydrated.
 * MotionConfig makes every framer-motion animation below respect the
 * user's prefers-reduced-motion setting.
 */
export function WizardShell({
  step,
  children,
}: {
  step: 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
}) {
  const guard = useAdminGuard();
  const classTitle = useAtomValue(aiClassTitleAtom);
  useAIWizardHydrate();

  if (guard !== 'ready') return null;

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto max-w-[1100px] px-6 py-16 lg:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
          admin / ai masterclass
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold">
          <Sparkles size={24} className="text-accent" aria-hidden />
          AI Masterclass
          <span className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-faint">
            step {step} of 5
          </span>
        </h1>
        {classTitle ? (
          <p className="mt-2 font-mono text-sm text-muted">
            generating: <span className="text-accent">{classTitle}</span>
          </p>
        ) : null}

        <ol className="mt-8 flex gap-2" aria-label="Wizard progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li
                key={label}
                className={`flex flex-1 items-center justify-center gap-1.5 border px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : done
                      ? 'border-success/40 text-success'
                      : 'border-line text-faint'
                }`}
              >
                {done ? <Check size={12} aria-hidden /> : <span>{n}.</span>}
                {label}
              </li>
            );
          })}
        </ol>

        <div className="mt-10">{children}</div>
      </main>
    </MotionConfig>
  );
}
