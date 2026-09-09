import Link from 'next/link';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Hero } from '@/components/landing/hero';
import { InstructorFlow } from '@/components/landing/instructor-flow';
import { SectionHeader } from '@/components/landing/section-header';
import { SeatsMeter } from '@/components/landing/seats-meter';
import { Ticker } from '@/components/system/ticker';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';

const CURRICULUM = [
  {
    id: '01',
    title: 'How AI actually writes code',
    desc: 'LLMs, tokens, context windows — why the AI sounds confident and still gets it wrong.',
  },
  {
    id: '02',
    title: 'Anatomy of an app',
    desc: 'Frontend, backend, database, API. What each part does and how they talk.',
  },
  {
    id: '03',
    title: 'Prompting like an engineer',
    desc: 'Specs, constraints, and iteration loops that produce code you can keep.',
  },
  {
    id: '04',
    title: 'Reading the code AI gives you',
    desc: 'You don’t need to write from scratch — you need to know what you’re shipping.',
  },
  {
    id: '05',
    title: 'Git & versioning basics',
    desc: 'Commit, branch, revert. Your safety net when a vibe goes wrong.',
  },
  {
    id: '06',
    title: 'Deploying without breaking things',
    desc: 'Env vars, databases in the cloud, and the checklist before you share a URL.',
  },
];

/* FOOTER_COLUMNS moved to @/components/layout/footer — single source of truth. */

export default function LandingPage() {
  const t = typeStyles;

  return (
    <main>
      <Hero />
      <Ticker />

      {/* WHY */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:py-36 lg:px-10">
        <SectionHeader
          name="WHY"
          title="Vibe coding without fundamentals is building on sand."
        />
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className={cn(t.body, 'text-muted lg:sticky lg:top-16')}>
              Most vibe coders ship fast — then get stuck the moment something breaks.
              Not because they lack talent, but because nobody showed them what&apos;s
              under the hood.
            </p>
          </div>
          <ul className="lg:col-span-7 lg:col-start-6">
            {[
              ['The black box problem', 'The AI generated it, but you can’t explain it — to users, to investors, or to the next prompt.'],
              ['Fragile by default', 'No architecture means every new feature risks breaking the last one.'],
              ['Debugging blind', 'When the error appears, “paste it back into the chat” only works so long.'],
            ].map(([title, body], i) => (
              <li key={title} className="border-b border-line py-8 first:border-t">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                  0{i + 1}
                </p>
                <h3 className={cn(t.headingS, 'mt-2')}>{title}</h3>
                <p className={cn(t.bodySm, 'mt-2 text-muted')}>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 02 / BASICS CLASS */}
      <section id="curriculum" className="border-y border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-28 lg:py-36 lg:px-10">
          <SectionHeader name="BASICS CLASS" title="Cohort 001 — the fundamentals, hands-on." />
          <ol className="mt-4">
            {CURRICULUM.map((mod) => (
              <li
                key={mod.id}
                className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-line py-8 transition-transform hover:translate-x-2"
              >
                <span className="font-mono text-sm font-bold text-accent-dim group-hover:text-accent">
                  {mod.id}
                </span>
                <div>
                  <h3 className={cn(t.headingS)}>{mod.title}</h3>
                  <p className={cn(t.bodySm, 'mt-1 text-muted')}>{mod.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 03 / INSTRUCTOR */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:py-36 lg:px-10">
        <SectionHeader name="WHO TEACHES YOU" title="An engineer, not a course reseller." />
        <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {/* left portrait placeholder with halftone treatment */}
          <div className="relative aspect-[3/4] overflow-hidden border border-line bg-inset lg:col-span-5 lg:aspect-auto lg:min-h-[30rem]">
            <div className="blueprint-grid absolute inset-0 opacity-60" aria-hidden />
            <InstructorFlow className="absolute inset-0 size-full" />
            <p className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.12em] text-faint" aria-hidden>
              fig.02 — the reka loop
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className={cn(t.displayM)}>Built by someone who ships for a living.</h3>
            <p className={cn(t.body, 'mt-8 text-muted')}>
              Reka Bytes is taught by a graduated software engineer who is also a
              Google Certified Project Manager — someone who writes production code
              daily and knows how to structure learning so it sticks.
            </p>
            <ul className="mt-10 flex flex-col gap-4">
              {[
                [BadgeCheck, 'Software Engineering graduate — real-world architecture, not theory'],
                [BadgeCheck, 'Google Certified Project Manager — structured cohorts & milestones'],
                [ShieldCheck, 'Small cohort (5 seats) — personal feedback on every submission'],
              ].map(([Icon, line], i) => {
                const Ico = Icon as typeof BadgeCheck;
                return (
                  <li key={i} className="flex items-start gap-3 border-l-2 border-accent-dim pl-5">
                    <Ico className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <span className={cn(t.bodySm, 'text-muted')}>{line as string}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* 04 / JOIN */}
      <section className="border-t border-line bg-elevated">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-16 px-6 py-28 lg:py-32 lg:grid-cols-8 lg:px-10">
          <div className="lg:col-span-5">
            <SectionHeader name="JOIN COHORT 001" title="Five seats. Real fundamentals. No fluff." />
            <p className={cn(t.body, 'mt-8 max-w-lg text-muted')}>
              Applications are reviewed personally. Once approved, you get access to
              the class and the private Discord where the cohort builds together.
            </p>
            <Link href="/register" className="mt-12 inline-block">
              <Button data-testid="join-register-cta">Apply now →</Button>
            </Link>
          </div>
          <div className="border border-line bg-canvas p-10 lg:col-span-3">
            <SeatsMeter variant="block" />
            <p className={cn(t.label, 'mt-8 text-faint')}>
              {'// already registered? '}
              <Link href="/login" className="text-accent underline-offset-4 hover:underline">
                check your status
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
