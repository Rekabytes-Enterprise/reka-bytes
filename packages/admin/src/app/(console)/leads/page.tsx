'use client';

/**
 * Leads — company-site enquiries from the public "start small" funnel
 * (free consultation / free mockup / RM 150 PRD). Single-page triage:
 * filter by status, expand a row to read the brief, set status, save notes.
 */
import { useState } from 'react';
import type { LeadDTO, LeadStatus } from '@reka-bytes/shared';
import { apiFetch, isApiClientError, LEAD_STATUSES } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useAdminQuery } from '@/hooks/api-query';
import { usePushToast } from '@/components/system/toaster';

const SERVICE_LABEL: Record<LeadDTO['service'], string> = {
  CONSULTATION: 'Consultation · free',
  MOCKUP: 'Mockup · free',
  PRD: 'PRD · RM 150',
  BUILD: 'Full app build',
};

const BUDGET_LABEL: Record<LeadDTO['budget'], string> = {
  UNDER_5K: 'budget < RM 5k',
  RANGE_5_15K: 'budget RM 5–15k',
  RANGE_15_50K: 'budget RM 15–50k',
  OVER_50K: 'budget RM 50k+',
  UNSURE: 'budget unsure',
};

const PLATFORM_LABEL: Record<LeadDTO['platform'], string> = {
  MOBILE: 'mobile app',
  WEB: 'web app',
  BOTH: 'mobile + web',
  UNSURE: 'platform unsure',
};

const STATUS_DOT: Record<LeadStatus, string> = {
  NEW: 'text-accent',
  CONTACTED: 'text-info',
  WON: 'text-success',
  LOST: 'text-faint',
  ARCHIVED: 'text-faint',
};

const FILTERS: Array<LeadStatus | 'ALL'> = ['ALL', 'NEW', 'CONTACTED', 'WON', 'LOST', 'ARCHIVED'];

export default function LeadsPage() {
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const pushToast = usePushToast();

  const { data: leads, loading, reload } = useAdminQuery<LeadDTO[]>('/api/admin/leads');

  const visible = (leads ?? []).filter((l) => filter === 'ALL' || l.status === filter);
  const newCount = (leads ?? []).filter((l) => l.status === 'NEW').length;

  const toggle = (lead: LeadDTO) => {
    if (expandedId === lead.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(lead.id);
    setNotesDraft(lead.adminNotes ?? '');
  };

  const setStatus = async (lead: LeadDTO, status: LeadStatus) => {
    try {
      await apiFetch<LeadDTO>(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        body: { status },
      });
      pushToast({ variant: 'success', title: `Lead marked ${status.toLowerCase()}` });
      reload();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: isApiClientError(err) ? err.message : 'Could not update lead',
      });
    }
  };

  const saveNotes = async (lead: LeadDTO) => {
    setSavingNotes(true);
    try {
      await apiFetch<LeadDTO>(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        body: { adminNotes: notesDraft.trim() === '' ? null : notesDraft },
      });
      pushToast({ variant: 'success', title: 'Notes saved' });
      reload();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: isApiClientError(err) ? err.message : 'Could not save notes',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <main>
      <header className="border-b border-line pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          reka·bytes / admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Leads
          {newCount > 0 && (
            <span className="ml-3 font-mono text-sm text-accent">{newCount} new</span>
          )}
        </h1>
      </header>

      {loading ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading leads…
        </p>
      ) : leads ? (
        <>
          {/* filters */}
          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
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
          <ul className="mt-6 border-t border-line" data-testid="leads-list">
            {visible.length === 0 && (
              <li className="py-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
                // no leads {filter !== 'ALL' ? `with status ${filter}` : 'yet'}
              </li>
            )}
            {visible.map((lead) => {
              const open = expandedId === lead.id;
              return (
                <li key={lead.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => toggle(lead)}
                    aria-expanded={open}
                    data-testid={`lead-row-${lead.email}`}
                    className="grid w-full grid-cols-1 items-center gap-2 py-5 text-left transition-colors hover:bg-elevated sm:grid-cols-[1fr_1fr_auto] sm:gap-6 sm:px-4"
                  >
                    <div>
                      <p className="font-body text-sm font-medium text-ink">{lead.name}</p>
                      <p className="font-mono text-xs text-muted">{lead.email}</p>
                    </div>
                    <p className="font-mono text-xs text-faint">
                      {SERVICE_LABEL[lead.service]} ·{' '}
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                    <span
                      data-testid={`lead-status-${lead.id}`}
                      className={cn(
                        'inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em]',
                        STATUS_DOT[lead.status],
                      )}
                    >
                      <span className="size-2 rounded-full bg-current" aria-hidden />
                      {lead.status}
                    </span>
                  </button>

                  {open && (
                    <div
                      data-testid={`lead-detail-${lead.id}`}
                      className="border-t border-line bg-elevated px-4 py-8 sm:px-8"
                    >
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* brief */}
                        <div>
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
                            // the brief
                          </p>
                          <p className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-ink">
                            {lead.message}
                          </p>
                          <ul className="mt-5 flex flex-wrap gap-2">
                            {[PLATFORM_LABEL[lead.platform], BUDGET_LABEL[lead.budget]].map(
                              (chip) => (
                                <li
                                  key={chip}
                                  className="border border-line bg-canvas px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
                                >
                                  {chip}
                                </li>
                              ),
                            )}
                          </ul>
                          <p className="mt-5 font-mono text-xs text-muted">
                            {lead.phone ? `phone · ${lead.phone}` : 'no phone given'}
                          </p>
                        </div>

                        {/* triage */}
                        <div>
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
                            // move to
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {LEAD_STATUSES.filter((s) => s !== lead.status).map((s) => (
                              <button
                                key={s}
                                type="button"
                                data-testid={`lead-status-${s.toLowerCase()}`}
                                onClick={() => setStatus(lead, s)}
                                className="border border-line px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                              >
                                {s}
                              </button>
                            ))}
                          </div>

                          <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
                            {'// private notes (not shown to the lead)'}
                          </p>
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={4}
                            data-testid="lead-notes"
                            placeholder="Scope notes, follow-up dates, quoted price…"
                            className="mt-3 w-full resize-y border border-line bg-canvas px-3 py-2 font-body text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveNotes(lead)}
                            disabled={savingNotes}
                            data-testid="lead-notes-save"
                            className="mt-3 border border-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-50"
                          >
                            {savingNotes ? 'saving…' : 'save notes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // failed to load leads
        </p>
      )}
    </main>
  );
}
