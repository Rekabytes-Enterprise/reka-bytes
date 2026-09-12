'use client';

/**
 * SceneFrame (PRD-06 §7) — renders an AI-authored widget block inside a
 * locked-down sandboxed iframe. The scene runs on an OPAQUE origin (no
 * allow-same-origin): it cannot touch cookies, rb_session, localStorage, the
 * parent DOM, or the network (CSP injected server-side at generation time,
 * see backend `scene-hardening.ts`). The only channel back is postMessage,
 * and we only trust height messages from this frame's own contentWindow.
 *
 * Fallback ladder: unreviewed → review-pending notice + fallbackMarkdown ·
 * frame errors / timeout / oversized → fallbackMarkdown · else live scene.
 */
import { useEffect, useRef, useState } from 'react';
import type { WidgetBlock } from '@reka-bytes/shared';
import { Markdown } from '@/components/student/markdown';

const MIN_HEIGHT = 240;
const MAX_HEIGHT = 4000;
const INITIAL_HEIGHT = 260;
/** No height message within this window → assume the scene failed to run. */
const LOAD_TIMEOUT_MS = 8000;

/** The ONLY message the parent accepts from a scene frame. */
interface SceneHeightMessage {
  source: 'rb-scene';
  type: 'height';
  height: number;
}

function isHeightMessage(data: unknown): data is SceneHeightMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).source === 'rb-scene' &&
    (data as Record<string, unknown>).type === 'height' &&
    typeof (data as Record<string, unknown>).height === 'number'
  );
}

function SceneFallback({ block, reason }: { block: WidgetBlock; reason: string }) {
  return (
    <div
      data-testid="scene-fallback"
      className="border border-line bg-inset px-5 py-4"
      data-reason={reason}
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
        // {block.title}
      </p>
      <div className="mt-2">
        <Markdown>{block.fallbackMarkdown}</Markdown>
      </div>
    </div>
  );
}

function SceneReviewPending({ block }: { block: WidgetBlock }) {
  return (
    <div
      data-testid="scene-review-pending"
      className="border border-dashed border-line bg-inset px-5 py-4"
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
        // interactive section pending review
      </p>
      <div className="mt-2">
        <Markdown>{block.fallbackMarkdown}</Markdown>
      </div>
    </div>
  );
}

export function SceneFrameView({ block, blockIndex }: { block: WidgetBlock; blockIndex: number }) {
  const [height, setHeight] = useState<number>(INITIAL_HEIGHT);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // External-system sync (iframe messages) — the one useEffect that is a
  // window/document listener, per the house effect policy.
  useEffect(() => {
    const timer = window.setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);

    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (!isHeightMessage(e.data)) return;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.floor(e.data.height))));
      setFailed(false);
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [blockIndex]);

  // An unreviewed scene never reaches the browser as an iframe at all.
  if (!block.reviewed) return <SceneReviewPending block={block} />;

  if (failed) return <SceneFallback block={block} reason="scene did not report within timeout" />;
  if (block.html.length > 200_000) {
    return <SceneFallback block={block} reason="scene exceeds size cap" />;
  }

  return (
    <figure className="m-0" data-testid={`scene-frame-${blockIndex}`}>
      <figcaption className="mb-2 flex items-baseline justify-between gap-4">
        <span
          data-testid="scene-title"
          className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim"
        >
          {block.title}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          interactive · sandboxed
        </span>
      </figcaption>
      <iframe
        ref={frameRef}
        srcDoc={block.html}
        title={block.title}
        sandbox="allow-scripts"
        loading="lazy"
        className="w-full rounded-lg border border-line bg-white"
        style={{ height }}
      />
      <figcaption className="mt-2 font-mono text-[11px] text-muted">{block.brief}</figcaption>
    </figure>
  );
}
