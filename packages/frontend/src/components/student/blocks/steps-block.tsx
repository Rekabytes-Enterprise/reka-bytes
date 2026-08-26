'use client';

import type { StepsBlock } from '@reka-bytes/shared';
import { Markdown } from '@/components/student/markdown';

export function StepsBlockView({ block }: { block: StepsBlock }) {
  return (
    <section data-testid="steps-block" className="rounded-card border border-line bg-elevated p-5 shadow-card">
      <h3 className="font-display text-lg font-semibold">{block.title}</h3>
      <ol className="mt-4 space-y-4">
        {block.steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs font-bold text-accent">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              {/* Same rendering boundary as the main lesson markdown (no raw HTML). */}
              <div className="[&_p]:my-1 [&_p]:text-sm [&_p]:text-muted [&_p]:leading-relaxed">
                <Markdown>{step.markdown}</Markdown>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
