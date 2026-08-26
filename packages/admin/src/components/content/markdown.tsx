'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/** Markdown preview for the admin lesson editor — same rendering rules as the student viewer (no rehype-raw). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-lesson max-w-none prose-headings:font-display">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
