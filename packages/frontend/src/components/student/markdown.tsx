'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/**
 * Lesson markdown renderer — the XSS boundary.
 * Deliberately NO `rehype-raw`: raw HTML in markdown renders as inert text,
 * never executed. Styling comes from `.prose.prose-lesson` (globals.css).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-lesson max-w-none prose-headings:font-display">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
