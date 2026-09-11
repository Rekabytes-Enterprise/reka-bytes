'use client';

/**
 * Block registry (LESSON-PLAN §3): type → React component. Every renderer only
 * reads zod-validated fields from the shared block union — the Container Rule.
 * Unknown/Phase-B/C block types degrade to a styled placeholder, never crash,
 * never raw-render.
 */
import type { ComponentType } from 'react';
import type { LessonBlock, StudentLessonBlock } from '@reka-bytes/shared';
import { ProseBlockView } from './prose-block';
import { CalloutBlockView } from './callout-block';
import { KeyTermsBlockView } from './key-terms-block';
import { ComparisonBlockView } from './comparison-block';
import { StepsBlockView } from './steps-block';
import { RecapBlockView } from './recap-block';
import { MermaidBlockView } from './mermaid-block';
import { InlineCheckBlockView } from './inline-check-block';

export interface BlockComponentProps {
  block: StudentLessonBlock;
  lessonId: string;
  blockIndex: number;
  /** Called when an interactive block triggers lesson auto-complete (PRD-03 §2). */
  onLessonCompleted?: () => void;
}

export function UnsupportedBlock({ kind }: { kind: string }) {
  return (
    <div
      data-testid="unsupported-block"
      className="border border-dashed border-line bg-inset px-5 py-4"
    >
      <p className="font-mono text-xs text-faint">
        // interactive block “{kind}” is not available in this view yet
      </p>
    </div>
  );
}

/**
 * Views declare their concrete block type; the registry guarantees they only
 * ever receive a block of that exact type (entries are keyed by it).
 * The single cast is safe — each view's block prop is a structural subtype of
 * StudentLessonBlock, and the registry is the only call site.
 */
function typed<C>(component: C): ComponentType<BlockComponentProps> {
  return component as ComponentType<BlockComponentProps>;
}

const REGISTRY: Partial<Record<LessonBlock['type'], ComponentType<BlockComponentProps>>> = {
  prose: typed(ProseBlockView),
  callout: typed(CalloutBlockView),
  'key-terms': typed(KeyTermsBlockView),
  comparison: typed(ComparisonBlockView),
  steps: typed(StepsBlockView),
  recap: typed(RecapBlockView),
  mermaid: typed(MermaidBlockView),
  'inline-check': typed(InlineCheckBlockView),
};

export function getBlockComponent(
  type: LessonBlock['type'],
): ComponentType<BlockComponentProps> | null {
  return REGISTRY[type] ?? null;
}
