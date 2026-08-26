'use client';

/**
 * Admin dashboard (PRD-03 §3.1): seat stats + quick actions + the 5 most
 * recent applications. The full filterable list lives on /applications.
 */
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { AdminStatsDTO, ApplicationDTO } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAdminQuery } from '@/hooks/api-query';

export default function AdminDashboard() {
  // Two parallel useAdminQuery atoms — no Promise.all effect, no cancelled flags.
  const { data: stats, loading: statsLoading } = useAdminQuery<AdminStatsDTO>('/api/admin/stats');
  const { data: applications, loading: appsLoading } = useAdminQuery<ApplicationDTO[]>('/api/admin/applications');

  if (statsLoading || appsLoading) {
    return (
      <main>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading console…</p>
      </main>
    );
  }

  return (
    <main>
      <header className="flex items-center justify-between border-b border-line pb-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
            reka·bytes / admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/applications"
            data-testid="nav-applications"
            className="border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Applications
          </Link>
          <Link
            href="/ai-masterclass"
            className="inline-flex items-center gap-2 border border-accent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-accent-ink"
          >
            <Sparkles size={14} aria-hidden />
            AI Masterclass
          </Link>
        </div>
      </header>

      {/* stats */}
      {stats && (
        <section className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4" data-testid="admin-stats">
          {[
            ['Approved', `${stats.approved}/${stats.cap}`, 'text-success'],
            ['Pending', String(stats.pending), 'text-warning'],
            ['Rejected', String(stats.rejected), 'text-danger'],
            ['Total', String(stats.totalApplications), 'text-ink'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-elevated p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">{label}</p>
              <p className={cn('mt-2 font-display text-3xl font-semibold', color)}>{value}</p>
            </div>
          ))}
        </section>
      )}

      {/* recent applications */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-faint">recent applications</h2>
          <Link
            href="/applications"
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline"
          >
            view all <ArrowRight size={12} />
          </Link>
        </div>
        <ul className="mt-4 border-t border-line" data-testid="recent-applications">
          {(applications ?? []).slice(0, 5).map((app) => (
            <li key={app.id} className="border-b border-line">
              <Link
                href={`/applications/${app.id}`}
                className="grid grid-cols-1 items-center gap-2 py-4 transition-colors hover:bg-elevated sm:grid-cols-[1fr_auto_auto] sm:gap-6 sm:px-4"
              >
                <div>
                  <p className="font-body text-sm font-medium text-ink">{app.user.name}</p>
                  <p className="font-mono text-xs text-muted">{app.user.email}</p>
                </div>
                <p className="font-mono text-xs text-faint">{new Date(app.createdAt).toLocaleDateString()}</p>
                <StatusBadge status={app.user.status} />
              </Link>
            </li>
          ))}
          {(applications ?? []).length === 0 && (
            <li className="py-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">// no applications yet</li>
          )}
        </ul>
      </section>
    </main>
  );
}
