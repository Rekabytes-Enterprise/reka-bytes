'use client';

/**
 * Applications — full list with status filters (PRD-03 §3.1 sidebar page).
 * Review/decision lives on /applications/[id].
 */
import { useState } from 'react';
import Link from 'next/link';
import type { ApplicationDTO, UserStatus } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAdminQuery } from '@/hooks/api-query';

const FILTERS: Array<UserStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL');

  // Server state via useAdminQuery (jotai atom) — 401/403/0 auto-redirects to /login.
  const { data: applications, loading } =
    useAdminQuery<ApplicationDTO[]>('/api/admin/applications');

  const visible = (applications ?? []).filter((a) => filter === 'ALL' || a.user.status === filter);

  return (
    <main>
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          reka·bytes / admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Applications</h1>
      </header>

      {loading ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading applications…
        </p>
      ) : applications ? (
        <>
          {/* filters */}
          <div className="mt-8 flex gap-2" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'border px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors',
                  filter === f
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* list */}
          <ul className="mt-6 border-t border-line" data-testid="applications-list">
            {visible.length === 0 && (
              <li className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
                // no applications {filter !== 'ALL' ? `with status ${filter}` : 'yet'}
              </li>
            )}
            {visible.map((app) => (
              <li key={app.id} className="border-b border-line">
                <Link
                  href={`/applications/${app.id}`}
                  data-testid={`application-row-${app.user.email}`}
                  className="grid grid-cols-1 items-center gap-2 py-5 transition-colors hover:bg-elevated sm:grid-cols-[1fr_1fr_auto_auto] sm:gap-6 sm:px-4"
                >
                  <div>
                    <p className="font-body text-sm font-medium text-ink">{app.user.name}</p>
                    <p className="font-mono text-xs text-muted">{app.user.email}</p>
                  </div>
                  <p className="font-mono text-xs text-faint">
                    {new Date(app.createdAt).toLocaleDateString()} · schema v{app.schemaVersion}
                  </p>
                  <StatusBadge status={app.user.status} />
                  <span className="hidden font-mono text-xs text-faint sm:block">review →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // failed to load applications
        </p>
      )}
    </main>
  );
}
