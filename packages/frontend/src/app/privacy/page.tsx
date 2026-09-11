import type { Metadata } from 'next';
import Link from 'next/link';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import {
  ADDRESS_NOT_PUBLISHED,
  CONTACT,
  GOVERNING_LAW,
  LEGAL_EFFECTIVE,
  LEGAL_UPDATED,
  OPERATOR,
  field,
  mailtoHref,
} from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — Reka Bytes',
  description:
    'How Reka Bytes collects, uses, and protects your personal data under the Malaysian Personal Data Protection Act 2010.',
};

/**
 * Malaysian PDPA-aligned privacy policy.
 *
 * The DOCUMENT TEXT (statutes, lawful bases, retention windows for the data we
 * collect) lives in this file. The OPERATOR IDENTITY (legal name, SSM no.,
 * email, address, hosting region) lives in the environment — see
 * `packages/frontend/.env.local.example` (`LEG_*` vars) and `src/lib/legal.ts`.
 *
 * Anything unset renders as a "[LEG_*]" placeholder rather than blank, so a
 * half-configured install cannot quietly ship an incomplete policy.
 *
 * Compliance: PDPA 2010 + MDTCC AI Ethics Guidelines 2024.
 */
export default function PrivacyPage() {
  const t = typeStyles;
  const emailHref = mailtoHref();

  return (
    <main>
      <SiteNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
          <Breadcrumb items={[{ label: 'home', href: '/' }, { label: 'privacy' }]} />
          <SectionHeader name="PRIVACY POLICY" title="How we handle your personal data." />
          <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-[0.12em] text-faint">
            <span>
              Effective: <span className="text-muted">{LEGAL_EFFECTIVE}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              Last updated: <span className="text-muted">{LEGAL_UPDATED}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              Jurisdiction: <span className="text-muted">{GOVERNING_LAW}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[860px] px-6 py-20 lg:px-0 lg:py-24">
        <article className="prose-policy space-y-12">
          <Section
            id="overview"
            num="1.0"
            title="Overview"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  Reka Bytes (&ldquo;Reka Bytes&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
                  &ldquo;our&rdquo;) operates this learning platform. The legal entity that is the
                  data controller of your personal data is{' '}
                  <span className="text-ink">{OPERATOR.name}</span>
                  {OPERATOR.registrationNo ? (
                    <>
                      {' '}
                      (registration no. <span className="text-ink">{OPERATOR.registrationNo}</span>)
                    </>
                  ) : (
                    <>
                      {' '}
                      <span className="text-faint">
                        {field(null, 'LEG_OPERATOR_REGISTRATION', '[SSM No.]')}
                      </span>
                    </>
                  )}
                  {OPERATOR.entityNote && <>, {OPERATOR.entityNote}</>}.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  This Privacy Policy explains how we collect, use, disclose, and protect personal
                  data when you visit our website, apply to a cohort, or use our learning platform.
                  We process your personal data in accordance with the{' '}
                  <span className="text-ink">Personal Data Protection Act 2010</span>{' '}
                  (&ldquo;PDPA&rdquo;) and the regulations made under it.
                </p>
              </>
            }
          />

          <Section
            id="what"
            num="2.0"
            title="What personal data we collect"
            body={
              <div className="overflow-hidden border border-line">
                <table className="w-full text-left">
                  <thead className="bg-elevated">
                    <tr className="border-b border-line">
                      <th className={cn(t.label, 'w-1/3 px-5 py-3 text-faint')}>Category</th>
                      <th className={cn(t.label, 'px-5 py-3 text-faint')}>Examples</th>
                    </tr>
                  </thead>
                  <tbody className={cn(t.bodySm, 'text-muted')}>
                    {[
                      ['Account', 'Name, email address, hashed password (bcrypt)'],
                      ['Application', 'Free-text answers to our cohort questionnaire'],
                      [
                        'Learning activity',
                        'Lessons started/completed, quiz scores, inline-check attempts (anonymised telemetry)',
                      ],
                      [
                        'Gamification',
                        'XP earned, badges unlocked, streak dates — derived from learning activity',
                      ],
                      [
                        'AI Masterclass uploads',
                        'PDF files you choose to upload for course generation; deleted after generation',
                      ],
                      [
                        'Technical',
                        'IP address, browser type, session cookie value (see Cookies Policy)',
                      ],
                    ].map(([cat, ex]) => (
                      <tr key={cat} className="border-b border-line last:border-b-0">
                        <td className="px-5 py-4 align-top text-ink">{cat}</td>
                        <td className="px-5 py-4 align-top">{ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />

          <Section
            id="how"
            num="3.0"
            title="How we collect your data"
            body={
              <ul className={cn(t.body, 'list-disc space-y-2 pl-6 text-muted')}>
                <li>
                  <span className="text-ink">Directly from you</span> — when you register an
                  account, submit an application, complete a lesson or quiz, upload a file to the AI
                  Masterclass, or contact us.
                </li>
                <li>
                  <span className="text-ink">Automatically</span> — through cookies and similar
                  technologies (see our{' '}
                  <Link href="/cookies" className="text-accent underline-offset-4 hover:underline">
                    Cookies Policy
                  </Link>
                  ).
                </li>
                <li>
                  We do <span className="text-ink">not</span> purchase personal data from data
                  brokers and we do not use third-party advertising trackers.
                </li>
              </ul>
            }
          />

          <Section
            id="purposes"
            num="4.0"
            title="Purposes of processing"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  We process your personal data for the following purposes, each a permissible
                  ground under the PDPA:
                </p>
                <ol className={cn(t.body, 'mt-4 list-decimal space-y-3 pl-6 text-muted')}>
                  <li>
                    <span className="text-ink">Service delivery</span> — operating the learning
                    platform, tracking your progress, generating quizzes, awarding XP and badges.
                  </li>
                  <li>
                    <span className="text-ink">Application review</span> — evaluating your
                    suitability for a cohort; storing decisions and reviewer notes.
                  </li>
                  <li>
                    <span className="text-ink">AI generation</span> — for the AI Masterclass,
                    sending your uploaded PDF to a third-party language model (see §5) to analyse
                    and produce course outlines, lessons, and quizzes.
                  </li>
                  <li>
                    <span className="text-ink">Communications</span> — sending service emails
                    (account, application status, security alerts). Marketing emails are only sent
                    with your explicit consent.
                  </li>
                  <li>
                    <span className="text-ink">Safety & integrity</span> — protecting against abuse,
                    debugging, fraud prevention, and enforcing our Terms of Use.
                  </li>
                  <li>
                    <span className="text-ink">Legal compliance</span> — record-keeping as required
                    by Malaysian law.
                  </li>
                </ol>
              </>
            }
          />

          <Section
            id="third-parties"
            num="5.0"
            title="Disclosure to third parties"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  We do not sell your personal data. We disclose it only as follows:
                </p>
                <ul className={cn(t.body, 'mt-4 list-disc space-y-2 pl-6 text-muted')}>
                  <li>
                    <span className="text-ink">Cloud hosting & database</span> — our hosting
                    provider, currently Supabase Pte. Ltd. (Singapore){' '}
                    {CONTACT.hostingRegion && (
                      <span className="text-faint">— database region: {CONTACT.hostingRegion}</span>
                    )}
                    .
                  </li>
                  <li>
                    <span className="text-ink">AI processing</span> — for the AI Masterclass,
                    uploaded PDFs and generation prompts are sent to large language models accessed
                    via OpenRouter (US) and Boundary ML&apos;s BAML runtime. PDFs are deleted from
                    our servers after generation; please review those providers&apos; policies for
                    their retention practices.
                  </li>
                  <li>
                    <span className="text-ink">Service providers</span> — strictly to subprocessors
                    who help us operate the platform (hosting, email delivery, error monitoring).
                    Each is bound by confidentiality and data-processing obligations no less
                    protective than this Policy.
                  </li>
                  <li>
                    <span className="text-ink">Legal</span> — where compelled by a Malaysian court
                    order, statutory body, or to protect our legal rights.
                  </li>
                </ul>
                <p className={cn(t.bodySm, 'mt-4 text-faint')}>
                  Where personal data is transferred outside Malaysia, we take reasonable steps to
                  ensure the recipient is bound by PDPA-equivalent or comparable data-protection
                  obligations.
                </p>
              </>
            }
          />

          <Section
            id="ai"
            num="6.0"
            title="AI-generated content"
            body={
              <p className={cn(t.body, 'text-muted')}>
                The Reka Bytes AI Masterclass uses generative AI to create course outlines, lessons,
                and quizzes from material you upload. AI-generated content may contain errors, bias,
                or material you do not have the right to reproduce. We review generated content
                before publication where feasible, but we do not guarantee its accuracy. AI outputs
                are not professional, legal, medical, or financial advice. Your uploaded source
                files are deleted from our servers once generation completes; we may retain
                anonymised generation metadata (job ID, timing, schema version) for service
                improvement.
              </p>
            }
          />

          <Section
            id="retention"
            num="7.0"
            title="Retention"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We retain personal data only for as long as necessary to fulfil the purposes in §4
                or to comply with legal, accounting, or reporting obligations. In practice:
              </p>
            }
          >
            <ul className={cn(t.bodySm, 'mt-4 list-disc space-y-2 pl-6 text-muted')}>
              <li>
                Account data — for the life of your account; deleted within 30 days of closure.
              </li>
              <li>Application data — 24 months after final decision, then deleted.</li>
              <li>Learning progress & XP — 36 months after last activity, then anonymised.</li>
              <li>
                AI Masterclass source PDFs — deleted within 24 hours of generation completion.
              </li>
              <li>Server logs — 90 days, then purged.</li>
              <li>
                Backups —{' '}
                {CONTACT.backupRetention ?? (
                  <span className="text-faint">
                    {field(null, 'LEG_BACKUP_RETENTION', '[retention window]')}
                  </span>
                )}
                .
              </li>
            </ul>
          </Section>

          <Section
            id="security"
            num="8.0"
            title="Security"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We use industry-standard safeguards appropriate to the sensitivity of the data: TLS
                in transit, encrypted-at-rest database storage, bcrypt password hashing, HTTP-only
                session cookies, principle-of-least-privilege access controls for staff, and an
                audit log of administrative actions. No system is perfectly secure; if we become
                aware of a breach affecting your personal data, we will notify you and the PDP
                Commissioner as required by law.
              </p>
            }
          />

          <Section
            id="rights"
            num="9.0"
            title="Your rights under the PDPA"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  Subject to the PDPA, you have the right to:
                </p>
                <ul className={cn(t.body, 'mt-4 list-disc space-y-2 pl-6 text-muted')}>
                  <li>
                    <span className="text-ink">Access</span> — request a copy of the personal data
                    we hold about you.
                  </li>
                  <li>
                    <span className="text-ink">Correct</span> — request that inaccurate data be
                    corrected.
                  </li>
                  <li>
                    <span className="text-ink">Withdraw consent</span> — at any time, where
                    processing is based on consent. Withdrawal does not affect the lawfulness of
                    processing before withdrawal.
                  </li>
                  <li>
                    <span className="text-ink">Stop processing for direct marketing</span> — we will
                    honour this immediately.
                  </li>
                  <li>
                    <span className="text-ink">Delete / erase</span> — subject to retention
                    obligations in §7.
                  </li>
                </ul>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  To exercise these rights, email{' '}
                  {emailHref ? (
                    <a
                      href={emailHref}
                      className="text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      {CONTACT.email}
                    </a>
                  ) : (
                    <span className="text-ink">
                      {field(CONTACT.email, 'LEG_CONTACT_EMAIL', '[contact email]')}
                    </span>
                  )}{' '}
                  from the address on your account. We will respond within 21 days. If you are
                  unsatisfied with our response, you may lodge a complaint with the{' '}
                  <span className="text-ink">Jabatan Perlindungan Data Peribadi (PDP)</span>.
                </p>
              </>
            }
          />

          <Section
            id="children"
            num="10.0"
            title="Minors"
            body={
              <p className={cn(t.body, 'text-muted')}>
                Reka Bytes is intended for users aged 18 and above, or 13 and above with verifiable
                parental consent. We do not knowingly collect personal data from children below
                these thresholds. If you believe a child has provided us data in violation of this
                Policy, contact us and we will delete it.
              </p>
            }
          />

          <Section
            id="changes"
            num="11.0"
            title="Changes to this Policy"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We may update this Policy from time to time. Material changes will be notified via
                email (where you have an account) and a prominent notice on this page. The
                &ldquo;Last updated&rdquo; date at the top reflects the current version. Continued
                use of the service after a change constitutes acceptance, except where a new purpose
                requires fresh consent under the PDPA.
              </p>
            }
          />

          <Section
            id="contact"
            num="12.0"
            title="Contact us"
            body={
              <div className="border border-line bg-elevated p-8">
                <p className={cn(t.body, 'text-ink')}>Data Controller</p>
                <p className={cn(t.body, 'mt-2 text-muted')}>
                  {OPERATOR.name}
                  {OPERATOR.registrationNo && (
                    <>
                      <br />
                      Registration no. {OPERATOR.registrationNo}
                    </>
                  )}
                  <br />
                  {CONTACT.postalAddress ?? ADDRESS_NOT_PUBLISHED}
                </p>
                <p className={cn(t.body, 'mt-6 text-ink')}>Privacy enquiries</p>
                <p className={cn(t.body, 'mt-2 text-muted')}>
                  Email:{' '}
                  {emailHref ? (
                    <a href={emailHref} className="text-accent underline-offset-4 hover:underline">
                      {CONTACT.email}
                    </a>
                  ) : (
                    <span className="text-faint">
                      {field(CONTACT.email, 'LEG_CONTACT_EMAIL', '[contact email]')}
                    </span>
                  )}
                </p>
              </div>
            }
          />

          <p className={cn(t.bodySm, 'border-t border-line pt-8 text-faint')}>
            This Policy is drafted in plain English for readability. In the event of any conflict
            between this English version and any translation, the English version prevails. This
            document is provided for informational purposes and does not constitute legal advice —
            please consult a qualified Malaysian legal practitioner for binding compliance review.
          </p>
        </article>
      </section>

      <Footer />
    </main>
  );
}

function Section({
  id,
  num,
  title,
  body,
  children,
}: {
  id: string;
  num: string;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = typeStyles;
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-4 flex items-baseline gap-4">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
          {num}
        </span>
        <h2 className={cn(t.headingS, 'text-ink')}>{title}</h2>
      </div>
      {body}
      {children}
    </section>
  );
}
