import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Smartphone, Globe, Sparkles, Wallet, GitBranch, Users } from 'lucide-react';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { LeadForm } from '@/components/landing/lead-form';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { Button } from '@/components/ui/button';
import { CONTACT, mailtoHref } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Reka Bytes — mobile & web app development',
  description:
    'Reka Bytes designs and builds mobile and web apps — free consultation and mockup, full PRD from RM 150, and AI-powered development with budgets that flex to your stage.',
};

const SERVICES = [
  {
    icon: Smartphone,
    id: '01',
    title: 'Mobile apps',
    desc: 'iOS and Android from one codebase — Expo / React Native, shipped to both stores with analytics, push notifications, and updates you can roll out safely.',
  },
  {
    icon: Globe,
    id: '02',
    title: 'Web apps',
    desc: 'Dashboards, portals, e-commerce, booking systems — Next.js web apps that load fast, rank well, and scale as your user count does.',
  },
  {
    icon: Sparkles,
    id: '03',
    title: 'AI-powered products',
    desc: 'Chat assistants, document pipelines, and smart features built on the same tech we teach in our academy — practical AI, not demo-ware.',
  },
] as const;

const ENGAGEMENT = [
  {
    icon: Wallet,
    title: 'Fixed scope, fixed price',
    desc: 'You bring the idea, we scope it together, you pay one agreed price. Best when the feature list is clear and you need certainty.',
  },
  {
    icon: GitBranch,
    title: 'MVP first, scale later',
    desc: 'Start with the smallest version that proves your idea — then grow it sprint by sprint. Spend stays low until the concept earns more.',
  },
  {
    icon: Users,
    title: 'Monthly retainer',
    desc: 'A dedicated build budget each month for ongoing work — new features, maintenance, and improvements as you go. Pause or stop anytime.',
  },
] as const;

type Starter = {
  price: string;
  title: string;
  desc: string;
  bullets?: ReadonlyArray<string>;
};

const STARTERS: Starter[] = [
  {
    price: 'FREE',
    title: 'Consultation',
    desc: 'Tell us your idea — on a call or over email. You get an honest take on scope, timeline, and budget. No obligation, no pressure.',
  },
  {
    price: 'FREE',
    title: 'Concept mockup',
    desc: 'We sketch your app as screens — a visual mockup of what you would be building, free with your consultation.',
  },
  {
    price: 'FROM RM 150',
    title: 'Full PRD document',
    desc: 'A complete product requirements document in PDF or Markdown — written to hand straight to an AI coding agent, phase by phase.',
    bullets: [
      'Functional requirements (FR)',
      'Non-functional requirements (NFR)',
      'Error-handling specification',
      'E2E test plan for UAT sign-off',
    ],
  },
];

export default function CompanyPage() {
  const t = typeStyles;
  const projectHref = mailtoHref() ?? `mailto:${CONTACT.email}`;

  return (
    <main>
      <SiteNav variant="main" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="blueprint-grid relative border-b border-line">
        <div className="mx-auto max-w-[1240px] px-6 pb-24 pt-40 lg:px-10 lg:pb-36 lg:pt-56">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            {'// reka bytes — app development studio'}
          </p>
          <h1 className={cn(t.displayXL, 'mt-6 max-w-4xl')}>
            We build your app —{' '}
            <span className="relative inline-block text-accent">
              mobile or web.
              <span className="absolute -bottom-1 left-0 h-px w-full bg-accent" aria-hidden />
            </span>
          </h1>
          <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
            Reka Bytes is an app development studio for founders and businesses who want it done
            right: real engineering fundamentals behind every screen, AI-accelerated delivery, and
            budgets that flex to your stage — from first MVP to full product.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-5">
            <a href="#start" data-testid="home-start-cta">
              <Button>
                Start a project <ArrowRight className="size-4" aria-hidden />
              </Button>
            </a>
            <Link href="/academy">
              <Button variant="ghost">Or learn to build it yourself — Reka Bytes Academy</Button>
            </Link>
          </div>
          <p className={cn(t.label, 'mt-12 text-faint')}>
            {'// free consultation · free mockup · full PRD from RM 150'}
          </p>
        </div>
      </section>

      {/* ── WHAT WE BUILD ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-36">
        <SectionHeader name="WHAT WE BUILD" title="One studio, three tracks." />
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className="group flex flex-col border border-line bg-elevated p-8 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <s.icon className="size-6 text-accent" aria-hidden />
                <span className="font-mono text-sm font-bold text-faint group-hover:text-accent">
                  {s.id}
                </span>
              </div>
              <h3 className={cn(t.headingS, 'mt-6')}>{s.title}</h3>
              <p className={cn(t.bodySm, 'mt-3 text-muted')}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── START SMALL (free → PRD) ─────────────────────────────────── */}
      <section id="start-small" className="border-b border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-36">
          <SectionHeader name="START SMALL" title="Free to start. PRD from RM 150." />
          <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
            Not ready to commission a full app? Start with the document. A proper PRD is the single
            best input for AI-assisted development — it tells the AI what to build, in what order,
            and what &ldquo;done&rdquo; means.
          </p>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STARTERS.map((s) => (
              <div
                key={s.title}
                className={cn(
                  'flex flex-col border bg-canvas p-8',
                  s.bullets ? 'border-line-strong shadow-[var(--shadow-lift)]' : 'border-line',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs font-bold uppercase tracking-[0.12em]',
                    s.bullets ? 'text-accent' : 'text-faint',
                  )}
                >
                  {s.price}
                </span>
                <h3 className={cn(t.headingS, 'mt-4')}>{s.title}</h3>
                <p className={cn(t.bodySm, 'mt-3 text-muted')}>{s.desc}</p>
                {s.bullets && (
                  <ul className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
                    {s.bullets.map((b) => (
                      <li key={b} className={cn(t.bodySm, 'flex gap-2 text-muted')}>
                        <span className="text-accent" aria-hidden>
                          +
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className={cn(t.label, 'mt-10 text-faint')}>
            {
              '// one document, AI-ready: feed it to Cursor, Claude, or any agent — or hand it back to us and we build it phase by phase.'
            }
          </p>
        </div>
      </section>

      {/* ── HOW WE WORK (flexible budget) ─────────────────────────────── */}
      <section id="engagement" className="border-y border-line bg-elevated">
        <div className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-36">
          <SectionHeader
            name="HOW WE WORK"
            title="Flexible budget — pay the way that fits your stage."
          />
          <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
            No rigid packages, no upsell wall. Tell us your idea and your budget range — we scope
            the build around it and pick the engagement model that keeps you in control.
          </p>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ENGAGEMENT.map((e) => (
              <div key={e.title} className="border-l-2 border-accent-dim pl-6">
                <e.icon className="size-5 text-accent" aria-hidden />
                <h3 className={cn(t.headingS, 'mt-4')}>{e.title}</h3>
                <p className={cn(t.bodySm, 'mt-2 text-muted')}>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY REKA BYTES ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-36">
        <SectionHeader name="WHY REKA BYTES" title="We train engineers — so we build like one." />
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className={cn(t.body, 'text-muted lg:sticky lg:top-16')}>
              Reka Bytes runs an academy that teaches non-CS people the software fundamentals behind
              vibe coding. The same fundamentals go into every app we ship for you — architecture
              first, no black boxes, no fragile builds.
            </p>
          </div>
          <ul className="lg:col-span-7 lg:col-start-6">
            {[
              [
                'Fundamentals first',
                'Proper architecture, versioning, and testing — your app survives its second feature, not just its demo.',
              ],
              [
                'AI-accelerated, engineer-checked',
                'We use AI to move fast, then review everything with production-grade judgment before it reaches you.',
              ],
              [
                'You own everything',
                'Full source code, deployment access, and documentation handed over — no lock-in, no hostage keys.',
              ],
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

      {/* ── START A PROJECT (lead form) ─────────────────────────────── */}
      <section id="start" className="border-t border-line bg-elevated">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-16 px-6 py-28 lg:grid-cols-8 lg:px-10 lg:py-32">
          <div className="lg:col-span-3">
            <SectionHeader
              name="START A PROJECT"
              title="Tell us the idea. We'll take it from there."
            />
            <p className={cn(t.body, 'mt-8 text-muted')}>
              Pick what you need — a free consultation, a free mockup, or the RM 150 PRD — and tell
              us what you're building. We reply personally within a day or two with an honest scope,
              timeline, and budget take.
            </p>
            <p className={cn(t.label, 'mt-10 text-faint')}>
              {'// prefer email? '}
              <a
                href={projectHref}
                data-testid="home-mailto-cta"
                className="text-accent underline-offset-4 hover:underline"
              >
                {CONTACT.email}
              </a>
            </p>
            <p className={cn(t.label, 'mt-4 text-faint')}>
              {'// want to build it yourself? '}
              <Link
                href="/academy"
                data-testid="home-academy-cta"
                className="text-accent underline-offset-4 hover:underline"
              >
                visit the academy
              </Link>
            </p>
          </div>
          <div className="border border-line bg-canvas p-8 lg:col-span-5 lg:p-10">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer variant="main" />
    </main>
  );
}
