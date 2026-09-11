'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Trash2 } from 'lucide-react';
import { apiFetch, isApiClientError, type ClassSummaryDTO } from '@reka-bytes/shared';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { useAdminQuery } from '@/hooks/api-query';
import { usePushToast } from '@/components/system/toaster';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ContentPage() {
  const guard = useAdminGuard();
  const pushToast = usePushToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClassSummaryDTO | null>(null);

  // Server state via useApiQuery (jotai atom); delete refetches via reload().
  const {
    data: classes,
    loading,
    reload,
  } = useAdminQuery<ClassSummaryDTO[]>(
    // Skip until the auth guard is ready — avoids a doomed request on hard reloads.
    guard === 'ready' ? '/api/admin/classes' : null,
  );

  async function performDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const cls = pendingDelete;
    setPendingDelete(null);
    try {
      await apiFetch(`/api/admin/classes/${cls.id}`, { method: 'DELETE' });
      pushToast({ variant: 'success', title: 'Class deleted' });
      reload();
    } catch (e: unknown) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  }

  if (guard !== 'ready') return null;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-8">
        <div>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-accent"
          >
            ← applications
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">Content Manager</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/ai-masterclass"
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover"
            data-testid="ai-masterclass-link"
          >
            <Sparkles size={14} aria-hidden />
            AI Masterclass
          </Link>
          <Link
            href="/content/class/new"
            className="border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            + new class
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading classes…
        </p>
      ) : !classes ? (
        <p className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // failed to load classes
        </p>
      ) : classes.length === 0 ? (
        <p
          className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint"
          data-testid="content-empty"
        >
          // no classes yet — create one or use AI masterclass
        </p>
      ) : (
        <ul className="mt-6 border-t border-line" data-testid="content-class-list">
          {classes.map((cls) => (
            <li key={cls.id} className="border-b border-line">
              <div className="grid grid-cols-1 items-center gap-2 py-5 transition-colors hover:bg-elevated sm:grid-cols-[1fr_auto_auto_auto] sm:gap-6 sm:px-4">
                <Link
                  href={`/content/class/${cls.id}`}
                  data-testid={`class-row-${cls.title}`}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-6"
                >
                  <div>
                    <p className="font-body text-sm font-medium text-ink">{cls.title}</p>
                    <p className="font-mono text-xs text-muted">
                      {cls.moduleCount} modules · {cls.lessonCount} lessons · {cls.quizCount}{' '}
                      quizzes
                    </p>
                  </div>
                  <span
                    className={`w-fit border px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] ${
                      cls.published ? 'border-success/40 text-success' : 'border-line text-faint'
                    }`}
                  >
                    {cls.published ? 'published' : 'draft'}
                  </span>
                  <span className="hidden font-mono text-xs text-faint sm:block">manage →</span>
                </Link>
                <button
                  type="button"
                  aria-label={`Delete class ${cls.title}`}
                  data-testid={`class-delete-${cls.title}`}
                  disabled={deletingId === cls.id}
                  onClick={() => setPendingDelete(cls)}
                  className="justify-self-end border border-line p-2 text-faint transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        busy={deletingId !== null}
        title={`Delete "${pendingDelete?.title}"?`}
        description={
          pendingDelete ? (
            <>
              This permanently deletes{' '}
              <strong>
                {pendingDelete.moduleCount} module{pendingDelete.moduleCount !== 1 ? 's' : ''}
              </strong>
              ,{' '}
              <strong>
                {pendingDelete.lessonCount} lesson{pendingDelete.lessonCount !== 1 ? 's' : ''}
              </strong>{' '}
              and{' '}
              <strong>
                {pendingDelete.quizCount} quiz{pendingDelete.quizCount !== 1 ? 'zes' : ''}
              </strong>
              . Student progress and knowledge-check events are deleted too.{' '}
              <strong>This cannot be undone.</strong>
            </>
          ) : undefined
        }
        confirmLabel="Delete class"
        onConfirm={performDelete}
        onClose={() => setPendingDelete(null)}
      />
    </main>
  );
}
