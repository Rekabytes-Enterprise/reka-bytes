import type { Metadata } from 'next';
import Link from 'next/link';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import {
  CONTACT,
  field,
  LEGAL_EFFECTIVE,
  LEGAL_UPDATED,
  mailtoHref,
} from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Cookies Policy — Reka Bytes',
  description:
    'How Reka Bytes uses cookies and similar technologies, in compliance with the Malaysian Personal Data Protection Act 2010.',
};

/**
 * Cookies Policy.
 *
 * Reka Bytes currently uses ONLY strictly-necessary cookies and limited localStorage.
 * There is no third-party analytics, advertising, or marketing tracking on the site.
 *
 * If/when analytics or marketing cookies are introduced, this page must be updated
 * BEFORE the change ships — PDPA Notice & Choice principle requires prior disclosure.
 */
export default function CookiesPage() {
  const t = typeStyles;

  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
          <Breadcrumb items={[{ label: 'home', href: '/' }, { label: 'cookies' }]} />
          <SectionHeader
            name="COOKIES POLICY"
            title="Cookies and similar technologies we use."
          />
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
              Strictly-necessary only: <span className="text-muted">yes</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[860px] px-6 py-20 lg:px-0 lg:py-24">
        <article className="prose-policy space-y-12">
          <Section
            id="what"
            num="1.0"
            title="What are cookies?"
            body={
              <p className={cn(t.body, 'text-muted')}>
                Cookies are small text files placed on your device when you visit a
                website. They are widely used to make sites work, improve performance,
                and provide information to site owners. &ldquo;Similar technologies&rdquo;
                include localStorage, sessionStorage, and pixels — we use localStorage for
                a small set of UI preferences described below.
              </p>
            }
          />

          <Section
            id="what-we-use"
            num="2.0"
            title="Cookies and storage we use"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  We use only cookies and storage that are{' '}
                  <span className="text-ink">strictly necessary</span> for the operation
                  of the Service, or that store non-personal UI preferences on your
                  device.
                </p>

                <h3 className={cn(t.headingS, 'mt-8 text-ink')}>a) Strictly necessary cookies</h3>
                <div className="mt-3 overflow-hidden border border-line">
                  <table className="w-full text-left">
                    <thead className="bg-elevated">
                      <tr className="border-b border-line">
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Name</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Purpose</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Type</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Duration</th>
                      </tr>
                    </thead>
                    <tbody className={cn(t.bodySm, 'text-muted')}>
                      <tr>
                        <td className="px-5 py-4 align-top font-mono text-ink">rb_session</td>
                        <td className="px-5 py-4 align-top">
                          Authenticates you after login. Holds a signed, HTTP-only JWT —
                          no readable personal data.
                        </td>
                        <td className="px-5 py-4 align-top">HTTP-only cookie</td>
                        <td className="px-5 py-4 align-top">7 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={cn(t.bodySm, 'mt-3 text-faint')}>
                  Strictly necessary cookies do not require consent under the PDPA
                  because the Service cannot function without them. Disabling them will
                  log you out and may break the Service.
                </p>

                <h3 className={cn(t.headingS, 'mt-10 text-ink')}>b) Local storage (non-essential)</h3>
                <div className="mt-3 overflow-hidden border border-line">
                  <table className="w-full text-left">
                    <thead className="bg-elevated">
                      <tr className="border-b border-line">
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Key</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Purpose</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Storage</th>
                        <th className={cn(t.label, 'px-5 py-3 text-faint')}>Contains PII</th>
                      </tr>
                    </thead>
                    <tbody className={cn(t.bodySm, 'text-muted')}>
                      <tr className="border-b border-line">
                        <td className="px-5 py-4 align-top font-mono text-ink">
                          rb-last-seen-badges
                        </td>
                        <td className="px-5 py-4 align-top">
                          Remembers which gamification badges you have already seen the
                          &ldquo;unlocked&rdquo; celebration for, so we don&apos;t show the
                          same toast repeatedly.
                        </td>
                        <td className="px-5 py-4 align-top">localStorage</td>
                        <td className="px-5 py-4 align-top">No (badge IDs only)</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-4 align-top font-mono text-ink">
                          theme preference
                        </td>
                        <td className="px-5 py-4 align-top">
                          Remembers your chosen colour theme (e.g. light/dark) so the
                          Service renders consistently between visits.
                        </td>
                        <td className="px-5 py-4 align-top">localStorage</td>
                        <td className="px-5 py-4 align-top">No</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={cn(t.bodySm, 'mt-3 text-faint')}>
                  These items are functional UI preferences stored only on your device.
                  They are not transmitted to our servers and contain no personal data.
                </p>
              </>
            }
          />

          <Section
            id="third-party"
            num="3.0"
            title="Third-party cookies"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We do <span className="text-ink">not</span> use third-party analytics,
                advertising networks, or social-media tracking pixels. The only
                third-party requests initiated by the Service are made to our backend
                API (<code className="font-mono text-ink">/api/*</code>) and, when you
                use the AI Masterclass, to our AI subprocessors (OpenRouter and Boundary
                ML). Those AI requests are made server-to-server and do not set cookies
                in your browser.
              </p>
            }
          />

          <Section
            id="controls"
            num="4.0"
            title="How to control cookies"
            body={
              <>
                <p className={cn(t.body, 'text-muted')}>
                  You can control cookies through your browser settings. Most browsers
                  allow you to block all cookies, block only third-party cookies, or
                  delete cookies when you close the browser. Note that blocking the{' '}
                  <code className="font-mono text-ink">rb_session</code> cookie will log
                  you out and may prevent the Service from working.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  To clear localStorage entries, use your browser&apos;s developer tools
                  (Application → Storage → Clear site data) or use private/incognito
                  browsing mode.
                </p>
                <p className={cn(t.body, 'mt-4 text-muted')}>
                  Browser-specific guidance:{' '}
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Chrome
                  </a>
                  ,{' '}
                  <a
                    href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Firefox
                  </a>
                  ,{' '}
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Safari
                  </a>
                  ,{' '}
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Microsoft Edge
                  </a>
                  .
                </p>
              </>
            }
          />

          <Section
            id="do-not-track"
            num="5.0"
            title="&ldquo;Do Not Track&rdquo; signals"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We honour &ldquo;Do Not Track&rdquo; (&ldquo;DNT&rdquo;) browser signals
                where they are technically applicable. Because we do not use third-party
                tracking cookies in the first place, there is currently no behavioural
                tracking for DNT to opt out of. If we add analytics or marketing cookies
                in future, this section will be updated and the new cookies will fully
                honour DNT / Global Privacy Control signals.
              </p>
            }
          />

          <Section
            id="changes"
            num="6.0"
            title="Changes to this Policy"
            body={
              <p className={cn(t.body, 'text-muted')}>
                We will update this page whenever our use of cookies or storage changes.
                Material additions (e.g. introducing analytics or marketing cookies) will
                be announced on this page and, where required by the PDPA, we will request
                your prior consent before such cookies are set.
              </p>
            }
          />

          <Section
            id="contact"
            num="7.0"
            title="Contact us"
            body={
              <p className={cn(t.body, 'text-muted')}>
                Questions about our use of cookies? Email{' '}
                {mailtoHref() ? (
                  <a
                    href={mailtoHref()!}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {CONTACT.email}
                  </a>
                ) : (
                  <span className="text-faint">
                    {field(CONTACT.email, 'LEG_CONTACT_EMAIL', '[contact email]')}
                  </span>
                )}
                . See our full{' '}
                <Link
                  href="/privacy"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>{' '}
                for data-protection rights under the PDPA.
              </p>
            }
          />

          <p className={cn(t.bodySm, 'border-t border-line pt-8 text-faint')}>
            This document is provided for informational purposes and does not constitute
            legal advice. Please consult a qualified Malaysian legal practitioner for
            binding compliance review.
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
