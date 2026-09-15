'use client';

/**
 * Lead intake form for the company-site "start small" funnel. Posts to
 * POST /api/public/leads (rate-limited, honeypot-guarded on the backend).
 * Validation mirrors the login form: client-side safeParse first, server
 * field errors mapped back onto the same keys.
 */
import { useState } from 'react';
import {
  apiFetch,
  isApiClientError,
  leadCreateSchema,
  LEAD_BUDGETS,
  LEAD_PLATFORMS,
  LEAD_SERVICES,
  type LeadBudget,
  type LeadDTO,
  type LeadPlatform,
  type LeadService,
} from '@reka-bytes/shared';
import { Button } from '@/components/ui/button';
import { usePushToast } from '@/components/system/toaster';

const SERVICE_LABELS: Record<LeadService, string> = {
  CONSULTATION: 'Consultation · free',
  MOCKUP: 'Mockup · free',
  PRD: 'PRD · RM 150',
  BUILD: 'Full app build',
};
const SERVICE_OPTIONS = LEAD_SERVICES.map((value) => ({ value, label: SERVICE_LABELS[value] }));

const PLATFORM_LABELS: Record<LeadPlatform, string> = {
  MOBILE: 'Mobile app',
  WEB: 'Web app',
  BOTH: 'Both',
  UNSURE: 'Not sure yet',
};
const PLATFORM_OPTIONS = LEAD_PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }));

const BUDGET_LABELS: Record<LeadBudget, string> = {
  UNDER_5K: '< RM 5k',
  RANGE_5_15K: 'RM 5–15k',
  RANGE_15_50K: 'RM 15–50k',
  OVER_50K: 'RM 50k+',
  UNSURE: 'Not sure yet',
};
const BUDGET_OPTIONS = LEAD_BUDGETS.map((value) => ({ value, label: BUDGET_LABELS[value] }));

const chipClass = (checked: boolean) =>
  [
    'cursor-pointer border px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors',
    checked
      ? 'border-accent bg-accent text-accent-ink'
      : 'border-line text-muted hover:border-line-strong hover:text-ink',
  ].join(' ');

const inputClass =
  'mt-2 w-full border border-line bg-canvas px-3 py-2.5 font-body text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none';

const labelClass = 'font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint';

export function LeadForm() {
  const pushToast = usePushToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState<LeadService>('CONSULTATION');
  const [platform, setPlatform] = useState<LeadPlatform>('UNSURE');
  const [budget, setBudget] = useState<LeadBudget>('UNSURE');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = leadCreateSchema.safeParse({
      name,
      email,
      phone: phone.trim() === '' ? undefined : phone,
      service,
      platform,
      budget,
      message,
      website,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await apiFetch<LeadDTO>('/api/public/leads', { method: 'POST', body: parsed.data });
      setDone(true);
    } catch (err) {
      if (isApiClientError(err)) {
        if (err.details) {
          setErrors(
            Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? ''])),
          );
        }
        pushToast({ variant: 'error', title: err.message });
      } else {
        pushToast({ variant: 'error', title: 'Could not send — try again' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        data-testid="lead-success"
        className="flex h-full flex-col justify-center border border-line bg-elevated p-10"
      >
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent">
          {'// enquiry received'}
        </p>
        <h3 className="mt-4 font-display text-2xl font-semibold text-ink">
          Got it — we&apos;ll reply within a day or two.
        </h3>
        <p className="mt-3 font-body text-sm leading-relaxed text-muted">
          Your brief lands directly in our inbox. If it&apos;s urgent, email us and mention this
          enquiry.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setMessage('');
          }}
          className="mt-8 self-start font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:text-accent-hover"
        >
          send another enquiry →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate data-testid="lead-form" className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* name */}
        <div>
          <label htmlFor="lead-name" className={labelClass}>
            name *
          </label>
          <input
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={inputClass}
            placeholder="Your name"
          />
          {errors.name && <p className="mt-1 font-mono text-xs text-danger">{errors.name}</p>}
        </div>
        {/* email */}
        <div>
          <label htmlFor="lead-email" className={labelClass}>
            email *
          </label>
          <input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
            placeholder="you@company.com"
          />
          {errors.email && <p className="mt-1 font-mono text-xs text-danger">{errors.email}</p>}
        </div>
      </div>

      {/* what do you need */}
      <fieldset>
        <legend className={labelClass}>what do you need?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map((o) => (
            <label key={o.value} className="contents">
              <input
                type="radio"
                name="lead-service"
                value={o.value}
                checked={service === o.value}
                onChange={() => setService(o.value)}
                className="sr-only"
                data-testid={`lead-service-${o.value.toLowerCase()}`}
              />
              <span className={chipClass(service === o.value)}>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* platform */}
        <fieldset>
          <legend className={labelClass}>building what?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((o) => (
              <label key={o.value} className="contents">
                <input
                  type="radio"
                  name="lead-platform"
                  value={o.value}
                  checked={platform === o.value}
                  onChange={() => setPlatform(o.value)}
                  className="sr-only"
                  data-testid={`lead-platform-${o.value.toLowerCase()}`}
                />
                <span className={chipClass(platform === o.value)}>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {/* budget */}
        <fieldset>
          <legend className={labelClass}>budget range</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((o) => (
              <label key={o.value} className="contents">
                <input
                  type="radio"
                  name="lead-budget"
                  value={o.value}
                  checked={budget === o.value}
                  onChange={() => setBudget(o.value)}
                  className="sr-only"
                  data-testid={`lead-budget-${o.value.toLowerCase()}`}
                />
                <span className={chipClass(budget === o.value)}>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* phone */}
      <div>
        <label htmlFor="lead-phone" className={labelClass}>
          phone / whatsapp · optional
        </label>
        <input
          id="lead-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          className={inputClass}
          placeholder="+60 12-345 6789"
        />
        {errors.phone && <p className="mt-1 font-mono text-xs text-danger">{errors.phone}</p>}
      </div>

      {/* message */}
      <div>
        <label htmlFor="lead-message" className={labelClass}>
          tell us the idea *
        </label>
        <textarea
          id="lead-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className={inputClass}
          placeholder="What are you building, who is it for, and roughly when do you want it live?"
        />
        {errors.message && <p className="mt-1 font-mono text-xs text-danger">{errors.message}</p>}
      </div>

      {/* honeypot — visually hidden, real users never see or fill it */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={submitting} data-testid="lead-submit">
          {submitting ? 'Sending…' : 'Send enquiry →'}
        </Button>
        <p className="font-mono text-[11px] leading-relaxed text-faint">
          {
            '// by submitting you agree we may contact you about this enquiry (PDPA 2010). Your details are never sold or shared.'
          }
        </p>
      </div>
    </form>
  );
}
