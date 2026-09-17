'use client';

/**
 * Journal markdown renderer with ```widget fence support (PRD-07 Phase 2).
 *
 * A `widget` fence renders as an interactive sandboxed scene by reusing the
 * lesson `SceneFrameView` + the PRD-06 hardening that already ran server-side
 * (CSP + height reporter were injected when the widget was cached — the
 * hardened HTML arrives inline in the post detail, so there is no per-widget
 * fetch). Invalid or failed widgets degrade to the fence's `fallback`
 * markdown; never to raw HTML. rehype-raw stays out (same XSS posture as the
 * lesson renderer).
 *
 * Review-gate note: lesson widgets gate on `reviewed` because an LLM authors
 * them. Journal widgets are authored by the founder and the commit IS the
 * review (PRD-07 §4.3), so they enter SceneFrameView with reviewed:true.
 */
import { isValidElement, useMemo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { parseWidgetFence } from '@reka-bytes/shared';
import { SceneFrameView } from '@/components/student/blocks/scene-frame';
import { Markdown } from '@/components/student/markdown';
import 'highlight.js/styles/github-dark.css';

interface CodeProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Deterministic fence ordinals: fence body text → its index in the post.
 * Computed from the source (not a render counter) so testids stay stable
 * across re-renders.
 */
function widgetOrdinals(body: string): Map<string, number> {
  const map = new Map<string, number>();
  let index = 0;
  for (const match of body.matchAll(/```widget\n([\s\S]*?)```/g)) {
    // Normalize the trailing newline so keys match react-markdown's code
    // children (which drop it).
    const inner = match[1]?.replace(/\n$/, '');
    if (inner !== undefined && !map.has(inner)) {
      map.set(inner, index);
      index += 1;
    }
  }
  return map;
}

function JournalWidget({
  source,
  widgetHtml,
  index,
}: {
  source: string;
  widgetHtml: Record<string, string>;
  index: number;
}) {
  const fence = parseWidgetFence(source);
  if (!fence) {
    // Malformed fence — inert code text, never a crash.
    return (
      <pre className="overflow-x-auto rounded-lg border border-line bg-inset p-4 text-sm">
        <code>{source}</code>
      </pre>
    );
  }
  const html = widgetHtml[fence.src];
  if (!html) {
    return (
      <div
        data-testid={`journal-fallback-${index}`}
        className="rounded-lg border border-line bg-inset px-5 py-4"
      >
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
          // {fence.title}
        </p>
        <div className="mt-2">
          <Markdown>{fence.fallback}</Markdown>
        </div>
      </div>
    );
  }
  return (
    <div data-testid={`journal-widget-${index}`} data-rb-src={fence.src}>
      <SceneFrameView
        block={{
          type: 'widget',
          title: fence.title,
          html,
          brief: fence.brief,
          fallbackMarkdown: fence.fallback,
          reviewed: true,
        }}
        blockIndex={index}
      />
    </div>
  );
}

function widgetFenceProps(node: ReactNode): CodeProps | null {
  if (isValidElement<CodeProps>(node) && typeof node.props.className === 'string') {
    if (node.props.className.includes('language-widget')) return node.props;
  }
  return null;
}

export function JournalMarkdown({
  children,
  widgetHtml,
}: {
  children: string;
  widgetHtml: Record<string, string>;
}) {
  const ordinals = useMemo(() => widgetOrdinals(children), [children]);

  const components = useMemo(
    () => ({
      pre: ({ children: kids }: { children?: ReactNode }) => {
        const only = Array.isArray(kids) ? kids[0] : kids;
        const props = widgetFenceProps(only);
        if (props) {
          const source = String(props.children ?? '').replace(/\n$/, '');
          const index = ordinals.get(source) ?? 0;
          return <JournalWidget source={source} widgetHtml={widgetHtml} index={index} />;
        }
        return <pre>{kids}</pre>;
      },
      code: ({ className, children: kids }: CodeProps) => <code className={className}>{kids}</code>,
    }),
    [ordinals, widgetHtml],
  );

  return (
    <div className="prose prose-lesson max-w-none prose-headings:font-display">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
