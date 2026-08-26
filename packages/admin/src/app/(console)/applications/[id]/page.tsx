'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  apiFetch,
  isApiClientError,
  QUESTION_META,
  type ApplicationDTO,
} from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { usePushToast } from '@/components/system/toaster';

type Decision = 'APPROVED' | 'REJECTED';

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const pushToast = usePushToast();

  const [app, setApp] = useState<ApplicationDTO | null>(null);
  const [modal, setModal] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ApplicationDTO>(`/api/admin/applications/${id}`)
      .then((a) => !cancelled && setApp(a))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (isApiClientError(e) && (e.status === 401 || e.status === 403 || e.status === 0)) {
          router.replace('/login');
          return;
        }
        pushToast({ variant: 'error', title: e instanceof Error ? e.message : 'Failed to load' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, router, pushToast]);

  async function decide(decision: Decision) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/applications/${id}/decision`, {
        method: 'PATCH',
        body: { decision, internalNote: note || undefined },
      });
      pushToast({ variant: 'success', title: `Application ${decision.toLowerCase()}` });
      setModal(null);
      router.refresh();
      // refetch
      const fresh = await apiFetch<ApplicationDTO>(`/api/admin/applications/${id}`);
      setApp(fresh);
    } catch (e) {
      pushToast({
        variant: 'error',
        title: e instanceof Error ? e.message : 'Decision failed',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!app) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading…</p>
      </main>
    );
  }

  const decided = app.user.status !== 'PENDING';

  return (
    <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1fr_360px] lg:px-10">
      {/* answers */}
      <div>
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-muted">
          ← all applications
        </Link>
        <h1 className="mt-6 font-display text-4xl font-semibold">{app.user.name}</h1>
        <p className="mt-2 font-mono text-sm text-muted">{app.user.email}</p>

        <dl className="mt-10 divide-y divide-line border-y border-line" data-testid="answers-list">
          {QUESTION_META.map((q) => {
            const val = app.answers[q.id];
            const rendered = Array.isArray(val) ? val.join(', ') : typeof val === 'string' ? val : '—';
            return (
              <div key={q.id} className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                  {q.id.toUpperCase()}
                </dt>
                <dd>
                  <p className="font-body text-xs text-muted">{q.label}</p>
                  <p className={cn('mt-1 font-body text-sm', rendered === '—' ? 'text-faint' : 'text-ink')}>
                    {rendered}
                  </p>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {/* decision panel */}
      <aside className="h-max border border-line bg-elevated p-8 lg:sticky lg:top-10">
        <StatusBadge status={app.user.status} />
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          submitted {new Date(app.createdAt).toLocaleDateString()} · v{app.schemaVersion}
        </p>

        {decided ? (
          <div className="mt-6 border-t border-line pt-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">Internal note</p>
            <p className="mt-2 font-body text-sm text-muted">{app.internalNote ?? '—'}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-faint">
              decided {app.decidedAt ? new Date(app.decidedAt).toLocaleDateString() : '—'}
            </p>
            {app.user.status === 'APPROVED' && (
              <p className="mt-6 border-l-2 border-accent-dim pl-4 font-body text-xs leading-relaxed text-muted">
                {'// internal SOP: send the Discord invite link to this student manually.'}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            <Button onClick={() => setModal('APPROVED')} data-testid="approve-btn">
              Approve applicant
            </Button>
            <Button variant="ghost" onClick={() => setModal('REJECTED')} data-testid="reject-btn">
              Reject applicant
            </Button>
          </div>
        )}
      </aside>

      {/* decision modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${modal === 'APPROVED' ? 'Approve' : 'Reject'} application`}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-canvas/70"
              onClick={() => !busy && setModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-md border border-line bg-elevated p-8"
              data-testid={`confirm-${modal.toLowerCase()}-modal`}
            >
              <h2 className="font-display text-2xl font-semibold">
                {modal === 'APPROVED' ? 'Approve this applicant?' : 'Reject this application?'}
              </h2>
              <p className="mt-2 font-body text-sm text-muted">
                {modal === 'APPROVED'
                  ? 'A seat will be claimed in Cohort 001. Remember to send the Discord invite manually after approving.'
                  : 'The applicant will see a rejection status when they log in.'}
              </p>
              <Textarea
                className="mt-6"
                placeholder="Internal note (optional) — why this decision?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="Internal note"
              />
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" disabled={busy} onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => decide(modal)}
                  disabled={busy}
                  className={cn(modal === 'REJECTED' && 'bg-danger text-white hover:bg-danger/90')}
                  data-testid="confirm-decision-btn"
                >
                  {busy ? 'Working…' : modal === 'APPROVED' ? 'Confirm approval' : 'Confirm rejection'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
