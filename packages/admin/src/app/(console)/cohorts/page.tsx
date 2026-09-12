'use client';

/**
 * Cohorts (dynamic cohort capacity). Admin-owned intake management: create a
 * cohort, set/edit its seat cap, activate one as the landing spot for new
 * registrations. Cap checks in the backend are scoped to the application's
 * cohort, so pending applications keep their own cohort's cap even after the
 * current flag moves.
 */
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { apiFetch, formatApiError, type CohortDTO } from '@reka-bytes/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { InlineText } from '@/components/ui/inline-edit';
import { useAdminQuery } from '@/hooks/api-query';
import { usePushToast } from '@/components/system/toaster';

export default function CohortsPage() {
  const pushToast = usePushToast();

  // Server state via useAdminQuery (jotai atom) — 401/403/0 auto-redirects to /login.
  const { data: cohorts, loading, reload } = useAdminQuery<CohortDTO[]>('/api/admin/cohorts');

  // Create form
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [creating, setCreating] = useState(false);

  // Activation in flight (per cohort id)
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch('/api/admin/cohorts', {
        method: 'POST',
        body: { name, cap },
      });
      setName('');
      setCap('');
      reload();
      pushToast({
        variant: 'success',
        title: 'Cohort created — activate it to receive registrations',
      });
    } catch (err) {
      const e = formatApiError(err);
      pushToast({ variant: 'error', title: e.title, description: e.description });
    } finally {
      setCreating(false);
    }
  }

  async function saveName(c: CohortDTO, next: string) {
    try {
      await apiFetch(`/api/admin/cohorts/${c.id}`, { method: 'PATCH', body: { name: next } });
      reload();
    } catch (err) {
      const e = formatApiError(err);
      pushToast({ variant: 'error', title: e.title, description: e.description });
      throw err; // InlineText stays in edit mode
    }
  }

  async function saveCap(c: CohortDTO, next: string) {
    const n = Number(next);
    try {
      await apiFetch(`/api/admin/cohorts/${c.id}`, { method: 'PATCH', body: { cap: n } });
      reload();
    } catch (err) {
      const e = formatApiError(err);
      pushToast({ variant: 'error', title: e.title, description: e.description });
      throw err; // InlineText stays in edit mode
    }
  }

  async function activate(c: CohortDTO) {
    setActivatingId(c.id);
    try {
      await apiFetch(`/api/admin/cohorts/${c.id}/activate`, { method: 'POST' });
      reload();
      pushToast({ variant: 'success', title: `${c.name} is now receiving registrations` });
    } catch (err) {
      const e = formatApiError(err);
      pushToast({ variant: 'error', title: e.title, description: e.description });
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <main>
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          reka·bytes / admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Cohorts</h1>
        <p className="mt-2 font-body text-sm text-muted">
          Each cohort owns its seat cap. Applications are stamped with a cohort at registration and
          approvals are counted against that cohort — even after the current flag moves to a newer
          one.
        </p>
      </header>

      {/* create */}
      <form
        onSubmit={onCreate}
        className="mt-8 flex flex-wrap items-end gap-4 border border-line bg-elevated p-6"
        data-testid="cohort-create-form"
      >
        <Field label="New cohort name" className="min-w-[14rem] flex-1">
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cohort 002"
              required
              data-testid="cohort-create-name"
            />
          )}
        </Field>
        <Field label="Seat cap" className="w-32">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="10"
              required
              data-testid="cohort-create-cap"
            />
          )}
        </Field>
        <Button type="submit" disabled={creating} data-testid="cohort-create-submit">
          {creating ? 'Creating…' : 'Create cohort'}
        </Button>
      </form>

      {/* list */}
      {loading ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading cohorts…
        </p>
      ) : (
        <ul className="mt-6 border-t border-line" data-testid="cohorts-list">
          {(cohorts ?? []).length === 0 && (
            <li className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
              // no cohorts yet
            </li>
          )}
          {(cohorts ?? []).map((c) => (
            <li
              key={c.id}
              data-testid={`cohort-row-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="grid grid-cols-1 items-center gap-3 border-b border-line py-5 sm:grid-cols-[minmax(10rem,1fr)_auto_auto_auto] sm:gap-6 sm:px-4"
            >
              <div className="flex items-center gap-3">
                <InlineText
                  value={c.name}
                  onSave={(next) => saveName(c, next)}
                  editLabel={`rename ${c.name}`}
                  className="max-w-[16rem]"
                />
                {c.isCurrent && (
                  <span
                    data-testid={`cohort-current-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="inline-flex items-center gap-1 border border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent-ink"
                  >
                    <CheckCircle2 size={11} aria-hidden /> current
                  </span>
                )}
              </div>

              <div className="font-mono text-xs text-muted">
                <span className="text-faint">cap </span>
                <InlineText
                  value={String(c.cap)}
                  onSave={(next) => saveCap(c, next)}
                  editLabel={`edit ${c.name} cap`}
                  className="w-24"
                />
              </div>

              <div className="font-mono text-xs text-muted" data-testid={`cohort-counts-${c.name}`}>
                <span className="text-ink">{c.approved}</span> approved · {c.pending} pending ·{' '}
                {c.applications} total
              </div>

              <Button
                variant={c.isCurrent ? 'ghost' : 'primary'}
                disabled={c.isCurrent || activatingId === c.id}
                onClick={() => activate(c)}
                data-testid={`cohort-activate-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {c.isCurrent
                  ? 'receiving registrations'
                  : activatingId === c.id
                    ? 'Activating…'
                    : 'Activate'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
