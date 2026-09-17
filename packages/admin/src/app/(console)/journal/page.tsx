'use client';

/**
 * Journal (PRD-07 §3.5) — READ-ONLY admin view. Content is authored as
 * Markdown files in the repo; the commit is the publication, so the console
 * deliberately has no editor. Each row links to GitHub's web editor on the
 * source file. Drafts and parse warnings (which exclude a post from the
 * public journal) are visible here so a typo never silently hides a post.
 */
import { Newspaper } from 'lucide-react';
import { typeStyles, type JournalAdminListDTO, type JournalStatus } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useAdminQuery } from '@/hooks/api-query';

const EDIT_BASE = 'https://github.com/Rekabytes-Enterprise/reka-bytes/edit/dev/content/journal/';

const STATUS_STYLES: Record<JournalStatus, string> = {
  published: 'text-success',
  draft: 'text-warning',
};

export default function JournalAdminPage() {
  const t = typeStyles;
  const { data, loading } = useAdminQuery<JournalAdminListDTO>('/api/admin/journal');

  return (
    <div>
      <h1 className={cn(t.displayM, 'text-ink')}>Journal</h1>
      <p className={cn(t.bodySm, 'mt-2 max-w-2xl text-muted')}>
        The public studio journal at <code className="font-mono text-accent">/journal</code>. Posts
        are Markdown files in the repo — edit them in git, not here. A post appears publicly once
        its <code className="font-mono">status</code> is{' '}
        <code className="font-mono text-accent">published</code> and the change is deployed.
      </p>

      {loading && (
        <p className={cn(t.label, 'mt-10 text-faint')}>
          <Newspaper className="mr-1 inline size-3 animate-pulse" aria-hidden />
          loading…
        </p>
      )}

      {data && data.posts.length === 0 && (
        <p className={cn(t.label, 'mt-10 text-faint')}>// no journal posts found on disk.</p>
      )}

      {data && data.posts.length > 0 && (
        <div className="mt-10 overflow-x-auto border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.posts.map((row) => (
                <tr key={row.slug} data-testid={`journal-admin-row-${row.slug}`}>
                  <td className="px-4 py-3 font-medium text-ink">{row.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.publishedAt}</td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`journal-admin-status-${row.slug}`}
                      className={cn(
                        'inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em]',
                        STATUS_STYLES[row.status],
                      )}
                    >
                      <span className="size-2 rounded-full bg-current" aria-hidden />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.featured ? <span className="text-accent">★ featured</span> : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {row.tags.map((tag) => `#${tag}`).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      data-testid={`journal-admin-edit-github-${row.slug}`}
                      href={`${EDIT_BASE}${row.file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent underline-offset-4 hover:underline"
                    >
                      edit on GitHub ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.warnings.length > 0 && (
        <div className="mt-8 border border-warning/40 bg-warning/5 p-5" role="alert">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-warning">
            parse warnings — these files are excluded from the journal
          </p>
          <ul className="mt-3 space-y-1">
            {data.warnings.map((w) => (
              <li key={w} className="font-mono text-xs text-muted">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
