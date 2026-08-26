'use client';

/**
 * Mermaid renderer — lazy-loaded, SSR off (mermaid cannot initialize at module
 * scope during Next build). SECURITY (LESSON-PLAN §6): `securityLevel: 'strict'`
 * + `htmlLabels: false` — output is pure SVG, no HTML injection surface.
 * Parse failure renders the source in a styled code block — never blank.
 */
import { useEffect, useId, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const MermaidInner = ({
  source,
  caption,
}: {
  source: string;
  caption?: string;
}) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const rawId = useId();
  const renderId = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);

    import('mermaid')
      .then((mod) => {
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'dark',
          flowchart: { htmlLabels: false },
        });
        return mermaid.render(renderId, source);
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [source, renderId]);

  if (failed) {
    return (
      <div className="border border-line bg-inset p-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
          <AlertTriangle size={12} /> diagram failed to render
        </p>
        <pre className="mt-3 overflow-x-auto font-mono text-xs text-muted">{source}</pre>
      </div>
    );
  }

  return (
    <figure data-testid="mermaid-block" className="border border-line bg-inset p-4">
      {svg ? (
        // mermaid strict-mode SVG output — sanitized by mermaid itself
        <div className="mermaid-svg overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="py-8 text-center font-mono text-xs text-faint">// rendering diagram…</p>
      )}
      {caption && (
        <figcaption className="mt-3 text-center font-mono text-xs text-faint">{caption}</figcaption>
      )}
    </figure>
  );
};

export default MermaidInner;
