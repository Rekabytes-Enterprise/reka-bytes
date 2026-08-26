'use client';

/** Client wrapper: mermaid is heavy (~500KB) and most lessons have no diagram on first paint. */
import dynamic from 'next/dynamic';
import type { MermaidBlock } from '@reka-bytes/shared';

const MermaidInner = dynamic(() => import('./mermaid-inner'), {
  ssr: false,
  loading: () => (
    <div className="rounded-panel border border-line bg-inset p-4">
      <p className="py-8 text-center font-mono text-xs text-faint">// loading diagram…</p>
    </div>
  ),
});

export function MermaidBlockView({ block }: { block: MermaidBlock }) {
  return <MermaidInner source={block.source} caption={block.caption} />;
}
