'use client';

import { BookOpen } from 'lucide-react';
import type { KeyTermsBlock } from '@reka-bytes/shared';

export function KeyTermsBlockView({ block }: { block: KeyTermsBlock }) {
  return (
    <section
      data-testid="key-terms-block"
      className="rounded-card border border-line bg-elevated p-5 shadow-card"
    >
      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
        <BookOpen size={13} /> key terms
      </p>
      <dl className="mt-4 space-y-3">
        {block.terms.map((t) => (
          <div key={t.term} className="grid gap-1 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="font-mono text-sm font-bold text-ink">{t.term}</dt>
            <dd className="text-sm leading-relaxed text-muted">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
