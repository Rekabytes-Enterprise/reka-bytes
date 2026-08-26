'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LearnDashboardDTO } from '@reka-bytes/shared';
import { useStudentGuard } from '@/hooks/use-student-guard';
import { useApiQuery } from '@/hooks/api-query';
import { Card } from '@/components/ui/card';

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative h-40 w-40" data-testid="progress-ring">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" className="stroke-line" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold">{pct}%</span>
        <span className="font-mono text-xs text-faint">
          {completed}/{total} done
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const state = useStudentGuard();

  // Skip until the auth guard is ready — avoids a doomed request on hard reloads.
  const { data, loading } = useApiQuery<LearnDashboardDTO>(
    state === 'ready' ? '/api/learn/dashboard' : null,
  );

  if (state === 'loading' || loading || !data) {
    return (
      <div data-testid="dashboard-loading">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
          // loading your progress…
        </p>
      </div>
    );
  }

  const empty = data.totalLessons === 0;

  return (
    <div data-testid="student-dashboard">
      <header className="pb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">cohort 001 · live</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Welcome back 👋</h1>
      </header>

      {empty ? (
        <Card
          className="mt-10 border-dashed p-12 text-center"
          data-testid="empty-classroom"
        >
          <h2 className="font-display text-2xl font-semibold">Your classroom is being set up</h2>
          <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-muted">
            We&apos;re preparing your first class right now. Check back soon — lessons will appear
            here the moment they go live.
          </p>
          <Link
            href="/learn"
            className="mt-8 inline-block rounded-full bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover"
          >
            go to learn →
          </Link>
        </Card>
      ) : (
        <>
          {/* Continue-learning hero */}
          <section
            className="card-surface glow-accent mt-8 overflow-hidden md:grid md:grid-cols-[280px_1fr]"
            data-testid="continue-hero"
          >
            <div className="flex items-center justify-center border-b border-line p-8 md:border-b-0 md:border-r">
              <ProgressRing completed={data.completedLessons} total={data.totalLessons} />
            </div>

            <div className="flex flex-col justify-center p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                continue learning
              </p>
              {data.nextLesson ? (
                <div className="mt-4">
                  <h2 className="font-display text-2xl font-semibold">{data.nextLesson.lessonTitle}</h2>
                  <p className="mt-2 font-body text-sm text-muted">
                    {data.nextLesson.moduleTitle} · {data.nextLesson.durationMinutes} min
                  </p>
                  <Link
                    href={`/learn/${data.nextLesson.lessonId}`}
                    data-testid="continue-cta"
                    className="mt-6 inline-block rounded-full bg-accent px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink shadow-lift transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
                  >
                    continue →
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <h2 className="font-display text-2xl font-semibold">You&apos;re all caught up! 🎉</h2>
                  <p className="mt-2 font-body text-sm text-muted">
                    Every lesson complete. Watch for new modules dropping soon.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <Card data-testid="recent-quizzes">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                recent quiz scores
              </p>
              {data.recentAttempts.length === 0 ? (
                <p className="mt-4 font-body text-sm text-faint">No quizzes taken yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line/60">
                  {data.recentAttempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-body text-sm">{a.quizTitle}</p>
                        <p className="font-mono text-xs text-faint">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-bold ${
                          a.passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {a.score}% {a.passed ? '✓' : '✗'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card data-testid="announcements">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">announcements</p>
              <div className="mt-4 border-l-2 border-accent pl-4">
                <p className="font-body text-sm leading-relaxed text-muted">
                  📌 Welcome to Cohort 001! Class materials are live — start with Module 1 and work
                  through the lessons in order.
                </p>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
