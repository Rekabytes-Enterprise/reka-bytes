'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { apiFetch } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { useStudentGuard } from '@/hooks/use-student-guard';
import { Card } from '@/components/ui/card';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

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
      <header className="pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Profile</h1>
      </header>

      {/* Identity card */}
      <Card className="flex items-center gap-5" data-testid="profile-identity">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-xl font-semibold text-accent ring-1 ring-accent/30"
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold">{user.name}</p>
          <p className="truncate font-mono text-xs text-faint">{user.email}</p>
        </div>
      </Card>

      <dl className="mt-6 grid grid-cols-[120px_1fr] gap-y-4 rounded-card border border-line bg-inset/60 p-6">
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
        data-testid="profile-logout"
        className="mt-10 rounded-full border border-danger/50 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-danger transition-colors hover:border-danger hover:bg-danger/10"
      >
        log out
      </button>
    </div>
  );
}
