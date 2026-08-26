'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { apiFetch } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { useStudentGuard } from '@/hooks/use-student-guard';

export default function ProfilePage() {
  const guard = useStudentGuard();
  const router = useRouter();
  const user = useAtomValue(sessionAtom);
  const setSession = useSetAtom(sessionAtom);

  if (guard === 'loading' || !user) return null;

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSession(null);
    router.push('/login');
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
      </header>

      <dl className="mt-8 grid grid-cols-[120px_1fr] gap-y-4">
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Name</dt>
        <dd className="font-body text-sm">{user.name}</dd>
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Email</dt>
        <dd className="font-body text-sm">{user.email}</dd>
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Cohort</dt>
        <dd className="font-body text-sm">001</dd>
      </dl>

      <button
        type="button"
        onClick={logout}
        className="mt-10 border border-line-strong px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:border-danger hover:text-danger"
      >
        log out
      </button>
    </div>
  );
}
