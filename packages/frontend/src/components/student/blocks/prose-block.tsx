'use client';

import { Markdown } from '@/components/student/markdown';
import type { ProseBlock } from '@reka-bytes/shared';

export function ProseBlockView({ block }: { block: ProseBlock }) {
  return <Markdown>{block.markdown}</Markdown>;
}
