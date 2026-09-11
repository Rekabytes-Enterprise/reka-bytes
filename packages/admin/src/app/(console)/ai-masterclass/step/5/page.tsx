'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { apiFetch, isApiClientError, type ClassTreeDTO } from '@reka-bytes/shared';
import { WizardShell } from '@/components/ai/wizard-shell';
import { useAIWizard } from '@/components/ai/state';
import { usePushToast } from '@/components/system/toaster';
import { useAdminQuery } from '@/hooks/api-query';

export default function Step5Page() {
  const router = useRouter();
  const wizard = useAIWizard();
  const pushToast = usePushToast();
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const classId = wizard.classId;

  // Guard: no class in the wizard → back to step 1 (lifecycle redirect — keep).
  useEffect(() => {
    if (!wizard.hydrated) return;
    if (!classId) router.replace('/ai-masterclass/step/1');
  }, [wizard.hydrated, classId, router]);

  // Summary fetch is best-effort; confirm still works without it.
  const { data: cls, loading } = useAdminQuery<ClassTreeDTO>(
    wizard.hydrated && classId ? `/api/admin/classes/${classId}` : null,
    { toastError: false },
  );

  async function confirm() {
    if (!classId || !cls) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/ai/masterclass/confirm', {
        method: 'POST',
        body: { classId, publish },
      });
      wizard.clear();
      setDone(true);
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Confirm failed' });
      setBusy(false);
    }
  }

  if (done) {
    return (
      <WizardShell step={5}>
        <div className="mx-auto max-w-[720px]">
          <div
            className="border border-success/40 bg-elevated p-10 text-center"
            data-testid="ai-publish-success"
          >
            <p className="font-display text-2xl font-semibold text-success">
              <CheckCircle2 size={24} className="mr-2 inline text-success" aria-hidden />
              Done!
            </p>
            <p className="mt-3 font-body text-sm text-muted">
              {publish ? 'Published — students can see it now.' : 'Saved as draft.'}{' '}
              {cls
                ? `${cls.modules.length} modules, ${cls.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons.`
                : ''}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/content"
                className="bg-accent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover"
              >
                view in content manager
              </Link>
            </div>
          </div>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell step={5}>
      {loading || !cls ? (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading…</p>
      ) : (
        <>
          <div className="border border-line bg-elevated p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              summary
            </p>
            <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-2 border-b border-line pb-6">
              <dt className="font-body text-sm text-muted">Class</dt>
              <dd className="font-body text-sm">{cls.title}</dd>
              <dt className="font-body text-sm text-muted">Modules</dt>
              <dd className="font-body text-sm">{cls.modules.length}</dd>
              <dt className="font-body text-sm text-muted">Lessons</dt>
              <dd className="font-body text-sm">
                {cls.modules.reduce((s, m) => s + m.lessons.length, 0)}
              </dd>
              <dt className="font-body text-sm text-muted">Quizzes</dt>
              <dd className="font-body text-sm">{cls.modules.filter((m) => m.quiz).length}</dd>
            </dl>

            <fieldset className="mt-6 space-y-2">
              <legend className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                Visibility
              </legend>
              {[
                { value: false, label: 'Save as draft (students cannot see it)' },
                { value: true, label: 'Publish now — visible to approved students' },
              ].map((opt) => (
                <label
                  key={String(opt.value)}
                  className="mt-2 flex items-center gap-3 font-body text-sm text-muted"
                >
                  <input
                    type="radio"
                    name="publish"
                    checked={publish === opt.value}
                    onChange={() => setPublish(opt.value)}
                    data-testid={`publish-radio-${opt.value}`}
                    className="accent-accent"
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <p className="font-mono text-xs text-faint">
              you can unpublish later from content manager
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              data-testid="ai-publish-btn"
              className="bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover disabled:opacity-40"
            >
              {busy ? 'saving…' : publish ? 'publish class →' : 'save draft →'}
            </button>
          </div>
        </>
      )}
    </WizardShell>
  );
}
