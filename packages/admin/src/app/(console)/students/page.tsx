'use client';

/**
 * Students directory (PRD-03 §3.3). Read-only v1 — approve/reject stays in
 * Applications. Row click → inline detail: per-class progress, quiz attempt
 * history, recent inline-check answers.
 */
import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { apiFetch, type StudentDetailDTO, type StudentListItemDTO, type UserStatus } from '@reka-bytes/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePushToast } from '@/components/system/toaster';
import { useAdminQuery } from '@/hooks/api-query';

const FILTERS: Array<UserStatus | 'ALL'> = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];

export default function StudentsPage() {
  const pushToast = usePushToast();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<UserStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetailDTO | null>(null);

  // Server state via useAdminQuery (jotai atom) — no mount-effect fetch.
  const { data: students, loading } = useAdminQuery<StudentListItemDTO[]>('/api/admin/students');

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetail(null);
      apiFetch<StudentDetailDTO>(`/api/admin/students/${id}`)
        .then(setDetail)
        .catch((e: unknown) => pushToast({ variant: 'error', title: e instanceof Error ? e.message : 'Failed to load student' }));
    },
    [pushToast],
  );

  const q = query.trim().toLowerCase();
  const visible = (students ?? []).filter(
    (s) =>
      (status === 'ALL' || s.status === status) &&
      (q === '' || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)),
  );

  return (
    <main>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">reka·bytes / admin</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Students</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-line px-3 py-2">
            <Search size={14} className="text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search name or email…"
              data-testid="students-search"
              className="w-48 bg-transparent font-mono text-xs text-ink outline-none placeholder:text-faint"
            />
          </div>
          <div className="flex border border-line">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatus(f)}
                className={`px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  status === f ? 'bg-elevated text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading students…</p>
      ) : students ? (
        <>
          <table className="mt-8 w-full border border-line text-left" data-testid="students-table">
            <thead>
              <tr className="border-b border-line bg-elevated font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Lessons done</th>
                <th className="px-4 py-3 text-right">Quiz attempts</th>
                <th className="px-4 py-3 text-right">Avg score</th>
                <th className="px-4 py-3 text-right">Last active</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => openDetail(s.id)}
                  data-testid={`student-row-${s.email}`}
                  className={`cursor-pointer border-b border-line transition-colors hover:bg-elevated ${
                    selectedId === s.id ? 'bg-elevated' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-body text-sm font-medium text-ink">{s.name}</p>
                    <p className="font-mono text-xs text-faint">{s.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-ink">{s.lessonsCompleted}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-ink">{s.quizAttempts}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-ink">{s.avgQuizScore != null ? `${s.avgQuizScore}%` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-faint">
                    {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs text-faint">
                    // no students match
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Detail panel */}
          {selectedId && (
            <section className="mt-8 border border-line bg-elevated p-6" data-testid="student-detail">
              {detail === null ? (
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading detail…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold">{detail.name}</h2>
                      <p className="font-mono text-xs text-faint">{detail.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={detail.status} />
                      <span className="font-mono text-xs text-faint">{detail.lessonsCompleted} lessons completed</span>
                      <button type="button" onClick={() => setSelectedId(null)} className="font-mono text-xs text-muted hover:text-ink">
                        close ✕
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-8 lg:grid-cols-2">
                    <div>
                      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-faint">quiz attempts</h3>
                      <ul className="mt-3 space-y-2">
                        {detail.quizAttempts.length === 0 && <li className="font-mono text-xs text-faint">// none yet</li>}
                        {detail.quizAttempts.map((a) => (
                          <li key={a.id} className="flex items-center justify-between border border-line px-4 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate font-body text-sm">{a.quizTitle}</p>
                              <p className="font-mono text-[10px] text-faint">{a.moduleTitle} · {new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`font-mono text-xs font-bold ${a.passed ? 'text-success' : 'text-danger'}`}>
                              {a.score}% {a.passed ? '✓' : '✗'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-faint">completed lessons</h3>
                      <ul className="mt-3 space-y-2">
                        {detail.progress.length === 0 && <li className="font-mono text-xs text-faint">// none yet</li>}
                        {detail.progress.map((p) => (
                          <li key={p.lessonId} className="border border-line px-4 py-2.5">
                            <p className="font-body text-sm">{p.lessonTitle}</p>
                            <p className="font-mono text-[10px] text-faint">{p.classTitle} · {p.moduleTitle} · {new Date(p.completedAt).toLocaleDateString()}</p>
                          </li>
                        ))}
                      </ul>

                      <h3 className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-faint">recent knowledge checks</h3>
                      <ul className="mt-3 space-y-1.5">
                        {detail.recentChecks.length === 0 && <li className="font-mono text-xs text-faint">// none yet</li>}
                        {detail.recentChecks.slice(0, 10).map((c, i) => (
                          <li key={i} className="flex items-center justify-between font-mono text-xs">
                            <span className="truncate text-muted">{c.lessonTitle} · check #{c.blockIndex + 1}</span>
                            <span className={c.correct ? 'text-success' : 'text-danger'}>{c.correct ? '✓' : '✗'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      ) : (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">// failed to load students</p>
      )}
    </main>
  );
}
