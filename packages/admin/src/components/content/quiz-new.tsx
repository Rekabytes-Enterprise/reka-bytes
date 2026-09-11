'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isApiClientError } from '@reka-bytes/shared';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { usePushToast } from '@/components/system/toaster';

export function QuizNew({ moduleId }: { moduleId: string }) {
  const guard = useAdminGuard();
  const router = useRouter();
  const pushToast = usePushToast();
  const [title, setTitle] = useState('Module Check');
  const [passingScore, setPassingScore] = useState('80');
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!moduleId) {
      pushToast({ variant: 'error', title: 'Missing moduleId — open this from a module' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ id: string }>('/api/admin/quizzes', {
        method: 'POST',
        body: { moduleId, title: title.trim(), passingScore: Number(passingScore) || 80 },
      });
      router.replace(`/content/quizzes/${res.id}`);
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Create failed' });
      setSaving(false);
    }
  }

  if (guard !== 'ready') return null;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Create Quiz</h1>
      <div className="mt-8 grid gap-5 border border-line bg-elevated p-6">
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            Passing score (%)
          </span>
          <input
            type="number"
            min={50}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={saving}
          data-testid="quiz-create-btn"
          className="w-fit bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover disabled:opacity-40"
        >
          {saving ? 'creating…' : 'create quiz'}
        </button>
      </div>
    </main>
  );
}
