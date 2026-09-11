'use client';

import type { ComparisonBlock } from '@reka-bytes/shared';

export function ComparisonBlockView({ block }: { block: ComparisonBlock }) {
  return (
    <div
      data-testid="comparison-block"
      className="overflow-x-auto rounded-panel border border-line"
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-elevated">
            {block.headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-line px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map(([a, b], i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-inset' : ''}>
              <td className="border-b border-line px-4 py-3 align-top font-medium text-ink">{a}</td>
              <td className="border-b border-line px-4 py-3 align-top text-muted">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
