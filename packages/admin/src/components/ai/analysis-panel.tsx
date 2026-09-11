'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Layers, ListChecks, Minus } from 'lucide-react';
import type { AIAnalysisDTO } from '@reka-bytes/shared';

interface Props {
  analysis: AIAnalysisDTO;
  defaultOpen?: boolean;
}

/**
 * Collapsible panel that renders the AI's structured PDF analysis.
 *
 * Replaces the old text-wall of flattened reviewNotes — each topic becomes a
 * row with a coverage badge (✓ EXPLAINED / ~ PARTIAL / ○ MENTIONED) and a
 * 2-line-clamped note that expands on click. Warnings and prerequisites
 * surface as their own compact sections.
 *
 * Default state on step 2 is collapsed (the panel is reference-only there);
 * step 4 leaves defaultOpen so the reviewer can scan everything.
 */
export function AnalysisPanel({ analysis, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const counts = countCoverage(analysis.topics);
  const gapCount = analysis.topics.filter((t) => t.needsExpansion).length;

  return (
    <section className="border border-line bg-elevated" data-testid="ai-analysis-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-inset"
      >
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent">
            <Layers size={13} className="mr-1.5 inline" aria-hidden />
            ai analysis of your pdf
          </span>
          <span className="font-mono text-xs text-faint">
            {analysis.topics.length} topic{analysis.topics.length === 1 ? '' : 's'} ·{' '}
            <span className="text-success">{counts.explained} explained</span>
            {counts.partial > 0 && (
              <>
                {' · '}
                <span className="text-warning">{counts.partial} partial</span>
              </>
            )}
            {counts.mentioned > 0 && (
              <>
                {' · '}
                <span className="text-muted">{counts.mentioned} mentioned</span>
              </>
            )}
            {gapCount > 0 && (
              <>
                {' · '}
                <span className="text-warning">{gapCount} need expansion</span>
              </>
            )}
            {analysis.warnings.length > 0 && (
              <>
                {' · '}
                <span className="text-danger">{analysis.warnings.length} warning</span>
                {analysis.warnings.length === 1 ? '' : 's'}
              </>
            )}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-line px-6 py-5">
          {analysis.summary && (
            <p className="font-body text-sm leading-relaxed text-ink">{analysis.summary}</p>
          )}

          {analysis.topics.length > 0 && (
            <ul className="mt-5 divide-y divide-line/60">
              {analysis.topics.map((t, i) => (
                <TopicRow key={`${i}-${t.title}`} topic={t} />
              ))}
            </ul>
          )}

          {analysis.warnings.length > 0 && (
            <div className="mt-5 border-l-2 border-danger bg-inset px-4 py-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-danger">
                <AlertTriangle size={12} className="mr-1.5 inline" aria-hidden />
                warnings
              </p>
              <ul className="mt-2 space-y-1">
                {analysis.warnings.map((w, i) => (
                  <li key={i} className="font-body text-xs leading-relaxed text-muted">
                    · {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.prerequisites.length > 0 && (
            <div className="mt-5 border-l-2 border-line-strong bg-inset px-4 py-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                <ListChecks size={12} className="mr-1.5 inline" aria-hidden />
                assumes (not taught)
              </p>
              <p className="mt-2 font-body text-xs leading-relaxed text-muted">
                {analysis.prerequisites.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface TopicRowProps {
  topic: AIAnalysisDTO['topics'][number];
}

function TopicRow({ topic }: TopicRowProps) {
  const [expanded, setExpanded] = useState(false);
  const Badge = COVERAGE_BADGE[topic.coverage];

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge.icon size={12} className={Badge.color} aria-hidden />
        <span className="font-body text-sm text-ink">{topic.title}</span>
        <span
          className={`font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${Badge.color}`}
          data-testid="ai-coverage-badge"
        >
          {topic.coverage.toLowerCase()}
        </span>
        {topic.needsExpansion && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
            · needs expansion
          </span>
        )}
      </div>
      {topic.notes && (
        <p
          onClick={() => setExpanded((e) => !e)}
          className={`mt-1 cursor-pointer pl-5 font-body text-xs leading-relaxed text-muted ${
            expanded ? '' : 'line-clamp-2'
          }`}
          title={expanded ? 'click to collapse' : 'click to expand'}
        >
          {topic.notes}
        </p>
      )}
    </li>
  );
}

const COVERAGE_BADGE = {
  EXPLAINED: { icon: Check, color: 'text-success' },
  PARTIAL: { icon: Minus, color: 'text-warning' },
  MENTIONED: { icon: Minus, color: 'text-faint' },
} as const;

function countCoverage(topics: AIAnalysisDTO['topics']) {
  return topics.reduce(
    (acc, t) => {
      acc[t.coverage.toLowerCase() as 'explained' | 'partial' | 'mentioned'] += 1;
      return acc;
    },
    { explained: 0, partial: 0, mentioned: 0 },
  );
}
