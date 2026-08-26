'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, isApiClientError } from '@reka-bytes/shared';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { usePushToast } from '@/components/system/toaster';

export default function NewClassPage() {
  const guard = useAdminGuard();
  const router = useRouter();
  const pushToast = usePushToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      pushToast({ variant: 'error', title: 'Title is required' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ id: string }>('/api/admin/classes', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description.trim() === '' ? undefined : description.trim(),
          coverImage: coverImage.trim() === '' ? undefined : coverImage.trim(),
        },
      });
      router.push(`/content/class/${res.id}`);
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Create failed' });
      setSaving(false);
    }
  }

  if (guard !== 'ready') return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/content" className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-accent">
        ← content manager
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">New Class</h1>

      <div className="mt-8 grid gap-5 border border-line bg-elevated p-6">
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="class-title-input"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Cover image URL</span>
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          data-testid="class-create-btn"
          className="w-fit bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {saving ? 'creating…' : 'create class'}
        </button>
      </div>
    </main>
  );
}
