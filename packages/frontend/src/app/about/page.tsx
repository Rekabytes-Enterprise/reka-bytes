import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Github } from 'lucide-react';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { CONTACT, FOUNDER, OPERATOR, SOCIAL, mailtoHref } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'About — Reka Bytes',
  description:
    'Reka Bytes is a small academy teaching non-CS people the software engineering fundamentals behind vibe coding. Founded by a software engineer in Malaysia.',
};

/**
 * About page.
 *
 * Company facts (legal name, SSM no., country, contact) come from the `LEG_*`
 * environment variables via `src/lib/legal.ts` — same source as the legal docs.
 *
 * <Tbc> now only appears as a fallback for an unset environment variable, so it
 * stays visible if a `LEG_*` value is ever removed from the deployment.
 */
export default function AboutPage() {
  const t = typeStyles;

  return (
    <main>
      <SiteNav />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
          <Breadcrumb items={[{ label: 'home', href: '/' }, { label: 'about' }]} />
          <SectionHeader
            name="ABOUT"
            title="We teach the fundamentals behind the vibe."
            className="mt-8 border-b-0 pb-0"
          />
          <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
            Reka Bytes is a small academy for people who build software with AI and want to actually
            understand what they shipped. No CS degree required — but no hand-waving either. Founded
            and taught by a software engineer in {OPERATOR.country}.
          </p>
        </div>
      </section>

      {/* ── The founder ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-32">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Portrait — 3:4, matches the landing's instructor block */}
          <figure className="relative mx-auto aspect-[3/4] w-full max-w-[17rem] overflow-hidden border border-line bg-inset sm:max-w-[19rem] lg:col-span-4 lg:mx-0 lg:w-auto lg:max-w-none lg:aspect-auto lg:min-h-[23rem]">
            <div className="blueprint-grid absolute inset-0 opacity-40" aria-hidden />
            <img
              src="/founder/studio-448.webp"
              srcSet="/founder/studio-448.webp 448w, /founder/studio-896.webp 896w"
              sizes="(max-width: 639px) 272px, (max-width: 1023px) 304px, 380px"
              width={896}
              height={1200}
              alt={`Portrait of ${FOUNDER.name ?? 'the founder'}, founder of Reka Bytes`}
              className="absolute inset-0 size-full object-cover"
              fetchPriority="high"
            />
            <figcaption className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              fig.01 — the founder
            </figcaption>
          </figure>

          <div className="lg:col-span-7 lg:col-start-6">
            <h2 className={cn(t.displayM)}>{FOUNDER.name ?? <Tbc>Your name here</Tbc>}</h2>
            <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
              Software Engineer · Google Certified Project Manager · Founder
            </p>

            <p className={cn(t.body, 'mt-8 text-muted')}>
              I graduated in software engineering and I write production code every day. I also
              spent time on the other side of the table as a Google Certified Project Manager —
              which is a strange combination, and it turns out to be the whole reason Reka Bytes
              exists.
            </p>
            <p className={cn(t.body, 'mt-5 text-muted')}>
              Most people I meet who are building with AI have never had anyone explain what the
              code actually is. Not because they lack ability — because nobody taught them that way.
              So I started teaching it this way: one small cohort, fundamentals first, and the AI
              used as the accelerator rather than the syllabus.
            </p>

            <blockquote className="mt-10 border-l-2 border-accent-dim pl-6">
              <p className={cn(t.body, 'text-ink')}>
                &ldquo;AI can write your code. We teach you what it actually wrote.&rdquo;
              </p>
            </blockquote>

            <ul className="mt-10 flex flex-col gap-4">
              {[
                'Software Engineering graduate — architecture and systems, not tutorials',
                'Google Certified Project Manager — cohorts structured around milestones',
                'Teaches every class personally — there is no second instructor',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  <span className={cn(t.bodySm, 'text-muted')}>{line}</span>
                </li>
              ))}
            </ul>

            {SOCIAL.github && (
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                <a
                  href={SOCIAL.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
                >
                  <Github className="size-3.5" aria-hidden />
                  {SOCIAL.github.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Why this exists ────────────────────────────────────────────── */}
      <section className="border-y border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-32">
          <SectionHeader
            name="WHY THIS EXISTS"
            title="Everyone can prompt now. Almost nobody can explain their own app."
          />
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className={cn(t.body, 'text-muted')}>
                The gap is not motivation. People are shipping more software than ever. The gap is
                that the moment something breaks, the project belongs to the AI again — and the
                person who paid for it has no way in.
              </p>
              <p className={cn(t.body, 'mt-6 text-muted')}>
                I kept noticing the same thing. People were shipping real software with AI, and
                almost none of them could explain what they’d built. The advice available to them
                came in two flavours: go learn computer science properly, which takes years they
                don’t have — or don’t worry about it, just prompt, which is how you end up owning an
                app you can’t fix. Both are wrong. You can be productive on day one and still
                understand your own system, if someone teaches it in the right order. That’s the
                thing I wanted to exist, so I built it.
              </p>
            </div>
            <ul className="lg:col-span-6 lg:col-start-7">
              {[
                [
                  'The black box',
                  'The model generated it. You cannot describe what it does to a user, an investor, or the next prompt.',
                ],
                [
                  'Fragile by default',
                  'With no structure holding it together, every new feature risks quietly breaking the last one.',
                ],
                [
                  'Debugging blind',
                  'Pasting the error back into the chat works right up until the moment it stops working.',
                ],
              ].map(([title, body]) => (
                <li key={title} className="border-b border-line py-7 first:border-t first:pt-0">
                  <h3 className={cn(t.headingS)}>{title}</h3>
                  <p className={cn(t.bodySm, 'mt-2 text-muted')}>{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── What we believe ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-32">
        <SectionHeader name="PRINCIPLES" title="Four constraints we keep on purpose." />
        <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 sm:grid-cols-2">
          {[
            [
              'Understanding is not optional',
              'If you cannot explain what your app does, you cannot maintain it, defend it, or extend it. Comprehension is the deliverable — the working software is the proof of it.',
            ],
            [
              'Small on purpose',
              'Five seats per cohort. That is a teaching constraint, not a growth strategy: every submission gets read by a human who can name what is wrong with it.',
            ],
            [
              'The AI is the accelerator, not the syllabus',
              'You will use AI constantly, exactly like a professional does. What you will not do is depend on it to understand your own project.',
            ],
            [
              'Fundamentals, taught in order',
              'Architecture before frameworks. Data flow before syntax. Debugging before polish. The sequence is the product — most courses skip it because order is hard to sell.',
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className={cn(t.headingS)}>{title}</h3>
              <p className={cn(t.bodySm, 'mt-3 text-muted')}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who it's for ───────────────────────────────────────────────── */}
      <section className="border-y border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-32">
          <SectionHeader name="WHO IT'S FOR" title="Honest about both columns." />
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
                This is for you if
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {[
                  'You already build with AI, but you can’t explain most of what it wrote.',
                  'You have no CS background and you’re tired of feeling like an impostor.',
                  'You want the fundamentals in plain language, not a degree.',
                  'You would rather be slowed down properly than shipped fast and broken.',
                  'You can commit real hours across a short cohort.',
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 border-l-2 border-accent-dim pl-5"
                  >
                    <span className={cn(t.bodySm, 'text-muted')}>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                This is not for you if
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {[
                  'You want a job guarantee or a certificate that substitutes for skill.',
                  'You want AI to write everything while you watch.',
                  'You want a self-serve video library you can finish in a weekend.',
                  'You are shopping for the cheapest option — small cohorts are not cheap to run.',
                  'You already think like a software engineer.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 border-l-2 border-line pl-5">
                    <span className={cn(t.bodySm, 'text-muted')}>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How a cohort runs ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-32">
        <SectionHeader name="HOW IT RUNS" title="Five steps, one human at a time." />
        <ol className="mt-14">
          {[
            [
              'Apply',
              'A short intake — account details plus a questionnaire about what you have built and where you get stuck.',
            ],
            [
              'Get reviewed',
              'Every application is read personally, usually within a day or two. Seats are limited to five.',
            ],
            [
              'Start the class',
              'Approved students get the classroom and the private Discord where the cohort actually works.',
            ],
            [
              'Learn the fundamentals',
              'Modules of interactive lessons, inline checks, and quizzes — with XP and streaks keeping the habit alive.',
            ],
            [
              'Leave able to explain it',
              'The exit bar is not finishing the content. It is being able to describe what your project does and why.',
            ],
          ].map(([title, body], i) => (
            <li
              key={title}
              className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-b border-line py-7 first:border-t"
            >
              <span className="font-mono text-sm font-bold text-accent-dim">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className={cn(t.headingS)}>{title}</h3>
                <p className={cn(t.bodySm, 'mt-1 text-muted')}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Company record ─────────────────────────────────────────────── */}
      <section className="border-t border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-28">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
            COMPANY RECORD
          </p>
          <dl className="mt-8 grid grid-cols-1 gap-x-16 sm:grid-cols-2">
            {(
              [
                ['Trading name', OPERATOR.productName],
                ['Legal entity', OPERATOR.name],
                ['Registration', OPERATOR.registrationNo ?? <Tbc>SSM no.</Tbc>],
                ['Legal status', OPERATOR.entityNote ?? <Tbc>Entity form</Tbc>],
                ['Based in', OPERATOR.country],
                [
                  'Contact',
                  mailtoHref() ? (
                    <a
                      href={mailtoHref()!}
                      className="text-accent underline-offset-4 hover:underline"
                    >
                      {CONTACT.email}
                    </a>
                  ) : (
                    <Tbc>contact email</Tbc>
                  ),
                ],
              ] as [string, React.ReactNode][]
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex flex-wrap items-baseline gap-x-4 border-b border-line py-4"
              >
                <dt className="w-36 shrink-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                  {k}
                </dt>
                <dd className={cn(t.bodySm, 'min-w-0 flex-1 text-muted')}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className={cn(t.bodySm, 'mt-8 max-w-2xl text-faint')}>
            Personal data handled by this business is covered by our{' '}
            <Link href="/privacy" className="text-accent underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            , written to the Malaysian Personal Data Protection Act 2010.
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <h2 className={cn(t.displayM)}>Cohort 001 has five seats.</h2>
            <p className={cn(t.bodySm, 'mt-3 text-muted')}>
              Applications are reviewed personally. Take the questionnaire, then we talk.
            </p>
          </div>
          <Link href="/register">
            <Button data-testid="about-register-cta">
              Apply now <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/**
 * Visible stand-in for a fact I could not know. Deliberately loud — a draft
 * that looks finished is more dangerous than one that admits its gaps.
 */
function Tbc({ children }: { children: React.ReactNode }) {
  return (
    <span
      title="Placeholder — replace before publishing"
      className="rounded border border-dashed border-warning/70 bg-warning/10 px-1.5 py-0.5 font-mono text-[0.8em] font-bold uppercase tracking-[0.08em] text-warning"
    >
      {children}
    </span>
  );
}
