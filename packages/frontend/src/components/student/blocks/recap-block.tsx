'use client';

import { CheckCircle2 } from 'lucide-react';
import type { RecapBlock } from '@reka-bytes/shared';

export function RecapBlockView({ block }: { block: RecapBlock }) {
  return (
    <section data-testid="recap-block" className="border border-line bg-elevated p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">// recap</p>
      <ul className="mt-3 space-y-2.5">
        {block.points.map((point, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
