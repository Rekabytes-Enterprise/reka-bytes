'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { apiFetch, type LearnDashboardDTO } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { useStudentGuard } from '@/hooks/use-student-guard';
import { useApiQuery } from '@/hooks/api-query';
import { Card } from '@/components/ui/card';
import { LevelPill } from '@/components/student/game/level-pill';
import { StreakCard } from '@/components/student/game/streak-card';
import { QuizAvgCard } from '@/components/student/game/quiz-avg-card';
import { BadgeGrid } from '@/components/student/game/badge-grid';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfilePage() {
  const guard = useStudentGuard();
  const router = useRouter();
  const user = useAtomValue(sessionAtom);
  const setSession = useSetAtom(sessionAtom);

  // Reuse the dashboard endpoint — already includes `game` (PRD-04 §4 tradeoff).
  // Profile only consumes game + quizAvgScore; extra fields are negligible.
  const { data, loading } = useApiQuery<LearnDashboardDTO>(
    guard === 'ready' ? '/api/learn/dashboard' : null,
  );

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSession(null);
    router.push('/login');
  }

  if (guard === 'loading' || !user) return null;

  const unlockedCount = data?.game.badges.filter((b) => b.unlocked).length ?? 0;
  const totalBadges = data?.game.badges.length ?? 10;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          account
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Profile</h1>
      </header>

      {/* Identity + level pill */}
      <Card className="flex items-center gap-5" data-testid="profile-identity">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-xl font-semibold text-accent ring-1 ring-accent/30"
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold">{user.name}</p>
          <p className="truncate font-mono text-xs text-faint">{user.email}</p>
        </div>
        {data && <LevelPill level={data.game.xp.level} />}
      </Card>

      {/* Stats trio ( ) */}
      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {data ? (
          <>
            <StreakCard
              current={data.game.streak.current}
              longest={data.game.streak.longest}
              activeToday={data.game.streak.activeToday}
            />
            <QuizAvgCard
              avg={data.quizAvgScore}
              passed={data.recentAttempts.filter((a) => a.passed).length}
            />
            <Card className="flex flex-col" data-testid="profile-badges-summary">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                badges
              </p>
              <p className="mt-4 font-display text-3xl font-semibold text-ink">
                {unlockedCount}
                <span className="text-base font-normal text-faint">/{totalBadges}</span>
              </p>
              <p className="mt-1 font-body text-xs text-faint">unlocked</p>
            </Card>
          </>
        ) : loading ? (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading…</p>
        ) : null}
      </section>

      {/* Identity fields */}
      <dl className="mt-6 grid grid-cols-[120px_1fr] gap-y-4 rounded-card border border-line bg-inset/60 p-6">
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Name</dt>
        <dd className="font-body text-sm">{user.name}</dd>
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
          Email
        </dt>
        <dd className="font-body text-sm">{user.email}</dd>
        <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
          Cohort
        </dt>
        <dd className="font-body text-sm">001</dd>
      </dl>

      {/* Account action — log out lives HERE (profile), not in the sidebar. */}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-card border border-line bg-inset/60 p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
          {'// end the session on this device'}
        </p>
        <button
          type="button"
          onClick={logout}
          data-testid="profile-logout"
          className="shrink-0 rounded-full border border-danger/50 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-danger transition-colors hover:border-danger hover:bg-danger/10"
        >
          log out
        </button>
      </div>

      {/* Badge collection */}
      <section className="mt-8">
        <header className="flex items-baseline justify-between pb-4">
          <h2 className="font-display text-xl font-semibold">Badges</h2>
          <p className="font-mono text-xs text-faint">
            <span className="text-ink">{unlockedCount}</span>
            <span> / {totalBadges} unlocked</span>
          </p>
        </header>
        {data ? (
          <BadgeGrid badges={data.game.badges} />
        ) : (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
            // loading badges…
          </p>
        )}
      </section>
    </div>
  );
}
