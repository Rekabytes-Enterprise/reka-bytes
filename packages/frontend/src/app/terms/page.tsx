import type { Metadata } from 'next';
import Link from 'next/link';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import {
  CONTACT,
  GOVERNING_LAW,
  LEGAL_EFFECTIVE,
  LEGAL_UPDATED,
  OPERATOR,
  field,
  mailtoHref,
} from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Use — Reka Bytes',
  description:
    'Terms governing your use of the Reka Bytes learning platform. Governed by the laws of Malaysia.',
};

/**
 * Malaysian-law terms for the Reka Bytes platform.
 *
 * The DOCUMENT TEXT (statutes, liability cap, governing law) lives in this
 * file. The OPERATOR IDENTITY (legal name, SSM no., email, address) lives in
 * the environment — see `packages/frontend/.env.local.example` (`LEG_*` vars)
 * and `src/lib/legal.ts`.
 *
 * No paid pricing yet → §7 is written to apply "if/when payment is introduced"
 * so this document does not need to be reissued on launch of paid cohorts.
 *
 * Compliance: Contracts Act 1950, Electronic Commerce Act 2006,
 * Consumer Protection Act 1999, PDPA 2010 (cross-referenced).
 */
export default function TermsPage() {
  const t = typeStyles;
  const emailHref = mailtoHref();

  return (
    <main>
      <SiteNav />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
          <Breadcrumb items={[{ label: 'home', href: '/' }, { label: 'terms' }]} />
          <SectionHeader name="TERMS OF USE" title="The rules of the road." />
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
              Governing law: <span className="text-muted">{GOVERNING_LAW}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[860px] px-6 py-20 lg:px-0 lg:py-24">
        <article className="prose-policy space-y-12">
          <Section
            id="acceptance"
            num="1.0"
            title="Acceptance"
            body={
              <p className={cn(t.body, 'text-muted')}>
                These Terms of Use (&ldquo;Terms&rdquo;) form a binding agreement between you and{' '}
                <span className="text-ink">{OPERATOR.name}</span> (the &ldquo;operator&rdquo;). By
                creating an account, submitting an application, or otherwise accessing our learning
                platform, you confirm that you have read, understood, and agreed to these Terms and
                to our{' '}
                <Link href="/privacy" className="text-accent underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                . If you do not agree, do not use the service.
              </p>
            }
          />

          <Section
            id="service"
            num="2.0"
            title="The service"
            body={
              <p className={cn(t.body, 'text-muted')}>
                Reka Bytes provides an online educational platform (&ldquo;the Service&rdquo;)
                comprising curated classes, interactive lessons, quizzes, an AI-assisted
                course-generation tool (the &ldquo;AI Masterclass&rdquo;), and a private community
                space for approved cohort members. The Service is provided on an &ldquo;as-is,
                as-available&rdquo; basis and we may modify, suspend, or discontinue any part of it
                at any time, with reasonable notice where practicable.
              </p>
            }
          />

          <Section
            id="eligibility"
            num="3.0"
            title="Eligibility & account responsibilities"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  You must be at least 18 years old (or 13 with verifiable parental consent) to use
                  the Service. You agree to:
                </p>
                <ul className={cn(t.body, 'mt-4 list-disc space-y-2 pl-6 text-muted')}>
                  <li>
                    Provide accurate, current, and complete information when registering or
                    applying.
                  </li>
                  <li>
                    Maintain the security of your account, including your password, and notify us
                    promptly of any unauthorised access.
                  </li>
                  <li>Accept responsibility for all activities that occur under your account.</li>
                  <li>
                    Not share your account credentials or allow another person to access the Service
                    through your account.
                  </li>
                </ul>
              </>
            }
          />

          <Section
            id="acceptable-use"
            num="4.0"
            title="Acceptable use"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  You agree <span className="text-ink">not</span> to:
                </p>
                <ul className={cn(t.body, 'mt-4 list-disc space-y-2 pl-6 text-muted')}>
                  <li>
                    Reverse-engineer, decompile, or otherwise attempt to derive source code or
                    underlying ideas of the Service (to the extent permitted by applicable law).
                  </li>
                  <li>
                    Upload, submit, or transmit content that is unlawful, infringing, defamatory,
                    obscene, hateful, or otherwise harmful — including uploading material you do not
                    have the right to share in the AI Masterclass.
                  </li>
                  <li>
                    Use the Service to build or train competing products, or to perform automated
                    scraping, prompt-injection, or model-extraction attacks against the AI
                    Masterclass.
                  </li>
                  <li>
                    Interfere with or disrupt the Service, its security features, or any other
                    user&apos;s enjoyment of it.
                  </li>
                  <li>Misrepresent your identity or affiliation with any person or entity.</li>
                </ul>
                <p className={cn(t.bodySm, 'mt-4 text-faint')}>
                  We may suspend or terminate accounts that breach this section, with or without
                  prior notice, in accordance with §8.
                </p>
              </>
            }
          />

          <Section
            id="ip"
            num="5.0"
            title="Intellectual property"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  All course content, lesson designs, code samples, illustrations, brand marks, and
                  software comprising the Service are owned by Reka Bytes or its licensors and are
                  protected by the <span className="text-ink">Copyright Act 1987</span> and
                  applicable international law.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  Subject to your compliance with these Terms, we grant you a limited,
                  non-exclusive, non-transferable, revocable licence to access and use the Service
                  and its content for personal, non-commercial learning. You may not redistribute,
                  republish, sell, or sublicense any part of the Service or its content without our
                  prior written consent.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  You retain ownership of any original content you submit (e.g. answers to
                  application questions, inline-check responses). You grant us a worldwide,
                  royalty-free licence to use such content solely to operate the Service and improve
                  our courses.
                </p>
              </>
            }
          />

          <Section
            id="ai-content"
            num="6.0"
            title="AI-generated content (AI Masterclass)"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  AI-generated content on the platform is produced by third-party large language
                  models. We do not guarantee its accuracy, completeness, or fitness for any
                  particular purpose. AI-generated lessons and quizzes may contain errors, bias, or
                  material that resembles third-party works.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  AI outputs are provided for educational use only and{' '}
                  <span className="text-ink">do not constitute</span> professional, legal, medical,
                  or financial advice. Where feasible, we review AI outputs before publication; you
                  acknowledge that any reliance on AI outputs is at your own risk.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  If you upload a document to the AI Masterclass, you confirm that you hold the
                  rights necessary to share it with us and our subprocessors, and that doing so does
                  not breach any confidentiality obligation or third-party rights.
                </p>
              </>
            }
          />

          <Section
            id="payment"
            num="7.0"
            title="Payment terms (when applicable)"
            body={
              <p className={cn(t.body, 'text-muted')}>
                Free cohorts and trial access are provided as described on the website at the time
                of enrolment. If and when paid cohorts, subscriptions, or one-time purchases are
                introduced, the applicable fees, billing cycle, and refund policy will be presented
                to you before you complete the transaction and will form part of this section. You
                agree to provide accurate payment information and authorise us (or our payment
                processor) to charge the stated fees. All fees are in Malaysian Ringgit (MYR) unless
                stated otherwise and are exclusive of any applicable taxes, which you are
                responsible for paying. Refund requests are reviewed case-by-case under the Consumer
                Protection Act 1999.
              </p>
            }
          />

          <Section
            id="termination"
            num="8.0"
            title="Suspension & termination"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  You may close your account at any time by contacting us. We may suspend or
                  terminate your access if you breach these Terms, if required by law, or if
                  continuing the Service to you is no longer commercially viable. Where reasonable,
                  we will give prior notice and an opportunity to remedy the breach.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  Upon termination, the licences granted to you under §5 end. Sections that by their
                  nature should survive (Intellectual Property, Disclaimers, Limitation of
                  Liability, Indemnity, Governing Law) will survive termination.
                </p>
              </>
            }
          />

          <Section
            id="disclaimers"
            num="9.0"
            title="Disclaimers"
            body={
              <p className={cn(t.body, 'text-muted')}>
                To the maximum extent permitted by Malaysian law, the Service is provided on an
                &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis without warranties of any
                kind, whether express or implied, including but not limited to warranties of
                merchantability, fitness for a particular purpose, non-infringement, or accuracy of
                content. We do not warrant that the Service will be uninterrupted, error-free, or
                free of harmful components.
              </p>
            }
          />

          <Section
            id="liability"
            num="10.0"
            title="Limitation of liability"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  To the maximum extent permitted by Malaysian law, Reka Bytes and its officers,
                  employees, and agents will not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, or any loss of profits, revenue, data, or
                  goodwill, arising out of or in connection with your use of the Service.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  Where liability cannot be excluded, our aggregate liability to you for all claims
                  arising out of or relating to the Service will not exceed the total amount you
                  have paid us (if any) in the twelve (12) months preceding the event giving rise to
                  the liability.
                </p>
                <p className={cn(t.bodySm, 'mt-4 text-faint')}>
                  Nothing in these Terms excludes or limits liability that cannot be excluded or
                  limited under Malaysian law (including liability for fraud, death, or personal
                  injury caused by negligence).
                </p>
              </>
            }
          />

          <Section
            id="indemnity"
            num="11.0"
            title="Indemnity"
            body={
              <p className={cn(t.body, 'text-muted')}>
                You agree to indemnify and hold harmless Reka Bytes and its officers, employees, and
                agents from any claim, demand, loss, or expense (including reasonable legal fees)
                arising out of your breach of these Terms, your misuse of the Service, or your
                violation of any applicable law or third-party right.
              </p>
            }
          />

          <Section
            id="changes"
            num="12.0"
            title="Changes to these Terms"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We may update these Terms from time to time. Material changes will be notified via
                email (where you have an account) and a prominent notice on this page. The
                &ldquo;Last updated&rdquo; date at the top reflects the current version. Continued
                use of the Service after a change constitutes acceptance. If you do not accept a
                change, you may close your account.
              </p>
            }
          />

          <Section
            id="law"
            num="13.0"
            title="Governing law & dispute resolution"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  These Terms are governed by the laws of Malaysia. Both parties submit to the
                  non-exclusive jurisdiction of the courts of Malaysia for any dispute arising out
                  of or in connection with these Terms or the Service.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  We encourage you to contact us first to try to resolve any dispute informally.
                  Nothing in this section limits your right to bring a claim before a competent
                  Malaysian tribunal, including the Tribunal for Homebuyer Claims (where applicable)
                  or the small-claims procedure.
                </p>
              </>
            }
          />

          <Section
            id="contact"
            num="14.0"
            title="Contact us"
            body={
              <div className="border border-line bg-elevated p-8">
                <p className={cn(t.body, 'text-ink')}>{OPERATOR.name}</p>
                {OPERATOR.registrationNo && (
                  <p className={cn(t.bodySm, 'mt-1 text-faint')}>
                    Registration no. {OPERATOR.registrationNo}
                  </p>
                )}
                <p className={cn(t.body, 'mt-2 whitespace-pre-line text-muted')}>
                  {CONTACT.postalAddress ?? 'Correspondence address on request.'}
                </p>
                <p className={cn(t.body, 'mt-6 text-ink')}>General &amp; legal enquiries</p>
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
            This document is provided for informational purposes and does not constitute legal
            advice. Please consult a qualified Malaysian legal practitioner for binding compliance
            review tailored to your circumstances.
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
}: {
  id: string;
  num: string;
  title: string;
  body: React.ReactNode;
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
    </section>
  );
}
