'use client';

/**
 * BlockRenderer (LESSON-PLAN §3): renders the sanitized StudentLessonBlock[]
 * via the type→component registry. Unknown types → UnsupportedBlock placeholder.
 */
import type { StudentLessonBlock } from '@reka-bytes/shared';
import { getBlockComponent, UnsupportedBlock, type BlockComponentProps } from './registry';

export function BlockRenderer({
  blocks,
  lessonId,
  onLessonCompleted,
}: {
  blocks: StudentLessonBlock[];
  lessonId: string;
  onLessonCompleted?: () => void;
}) {
  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        const Component = getBlockComponent(block.type);
        if (!Component) return <UnsupportedBlock key={index} kind={block.type} />;
        const props: BlockComponentProps = {
          block,
          lessonId,
          blockIndex: index,
          onLessonCompleted,
        };
        return (
          <div key={index} data-testid={`block-${block.type}`}>
            <Component {...props} />
          </div>
        );
      })}
    </div>
  );
}
