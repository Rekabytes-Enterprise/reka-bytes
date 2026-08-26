'use client';

import { Markdown } from '@/components/student/markdown';
import type { CalloutVariant, CalloutBlock } from '@reka-bytes/shared';

const VARIANT_STYLES: Record<CalloutVariant, { label: string; border: string; text: string }> = {
  info: { label: 'info', border: 'border-l-info', text: 'text-info' },
  warning: { label: 'warning', border: 'border-l-warning', text: 'text-warning' },
  mistake: { label: 'common mistake', border: 'border-l-danger', text: 'text-danger' },
  tip: { label: 'tip', border: 'border-l-accent', text: 'text-accent' },
};

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const style = VARIANT_STYLES[block.variant];
  return (
    <aside
      data-testid="callout-block"
      className={`border border-line border-l-2 ${style.border} bg-inset px-5 py-4`}
    >
      <p
        className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${style.text}`}
      >
        // {block.title}
      </p>
      <div className="prose prose-lesson mt-2 max-w-none">
        <Markdown>{block.markdown}</Markdown>
      </div>
    </aside>
  );
}

export type { CalloutVariant };
