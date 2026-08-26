'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  QUESTION_META,
  accountSchema,
  apiFetch,
  isApiClientError,
  type Answers,
} from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { SeatsMeter } from '@/components/landing/seats-meter';
import { usePushToast } from '@/components/system/toaster';

type Step = 0 | 1 | 2;
type FieldErrors = Record<string, string>;
type AnswerValue = string | string[];

const STEPS = ['ACCOUNT', 'QUESTIONNAIRE', 'REVIEW'] as const;

export default function RegisterPage() {
  const router = useRouter();
  const pushToast = usePushToast();

  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [account, setAccount] = useState({ name: '', email: '', password: '' });
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const answerList = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, Array.isArray(v) ? v : v]),
      ) as Answers,
    [answers],
  );

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function validateStep(target: Step): boolean {
    const nextErrors: FieldErrors = {};

    if (target === 1 || target === 2) {
      const parsed = accountSchema.safeParse(account);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          nextErrors[String(issue.path[0])] = issue.message;
        }
      }
    }
    if (target === 2) {
      // required-question check without full zod defaults
      for (const q of QUESTION_META) {
        const val = answers[q.id];
        if (q.type === 'multi' && q.required && (!val || (val as string[]).length === 0)) {
          nextErrors[q.id] = 'Pick at least one option';
        }
        if (q.type !== 'multi' && q.required) {
          const s = typeof val === 'string' ? val : '';
          if (!s.trim()) nextErrors[q.id] = 'This question is required';
          else if (q.minLength && s.trim().length < q.minLength)
            nextErrors[q.id] = `Write at least ${q.minLength} characters`;
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep((step + 1) as Step)) return;
    setStep((s): Step => Math.min(2, s + 1) as Step);
  }

  async function submit() {
    if (!validateStep(2)) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { ...account, answers: answerList },
      });
      setDone(true);
    } catch (e) {
      if (isApiClientError(e)) {
        if (e.details) {
          setErrors(
            Object.fromEntries(Object.entries(e.details).map(([k, v]) => [k, v[0] ?? ''])),
          );
          setStep(0);
        }
        pushToast({ variant: 'error', title: e.message });
      } else {
        pushToast({ variant: 'error', title: 'Registration failed — try again' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <span className="flex size-14 items-center justify-center border border-accent-dim">
          <Check className="size-6 text-accent" aria-hidden />
        </span>
        <h1 className="mt-8 font-display text-4xl font-semibold">Application received.</h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-muted">
          We review every application personally — usually within a day or two.
          Log in anytime to check your status.
        </p>
        <div className="mt-10 flex gap-4">
          <Button onClick={() => router.push('/login')}>Go to login</Button>
          <Link href="/">
            <Button variant="ghost">Back home</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-[1240px] grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[240px_1fr] lg:px-10">
      {/* live cohort capacity */}
      <div className="order-first lg:col-span-2">
        <SeatsMeter variant="chip" />
      </div>

      {/* progress rail */}
      <aside aria-label="Progress">
        <ol className="flex gap-4 lg:flex-col">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <span
                className={cn(
                  'font-mono text-sm font-bold',
                  i === step ? 'text-accent' : i < step ? 'text-success' : 'text-faint',
                )}
              >
                {i < step ? '✓' : `0${i + 1}`}
              </span>
              <span
                className={cn(
                  'font-mono text-xs font-bold uppercase tracking-[0.12em]',
                  i === step ? 'text-ink' : 'text-faint',
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      {/* form area */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {step === 0 && (
              <section>
                <h1 className="font-display text-3xl font-semibold">Create your account</h1>
                <p className="mt-2 font-body text-sm text-muted">
                  Step 1 of 3 — who are we talking to?
                </p>
                <div className="mt-10 flex flex-col gap-6">
                  <Field label="Full name" error={errors.name}>
                    {(id) => (
                      <Input
                        id={id}
                        value={account.name}
                        invalid={!!errors.name}
                        onChange={(e) => setAccount({ ...account, name: e.target.value })}
                        placeholder="Aisyah Rahman"
                        autoComplete="name"
                      />
                    )}
                  </Field>
                  <Field label="Email" error={errors.email}>
                    {(id) => (
                      <Input
                        id={id}
                        type="email"
                        value={account.email}
                        invalid={!!errors.email}
                        onChange={(e) => setAccount({ ...account, email: e.target.value })}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    )}
                  </Field>
                  <Field label="Password" error={errors.password} hint="Minimum 8 characters">
                    {(id) => (
                      <Input
                        id={id}
                        type="password"
                        value={account.password}
                        invalid={!!errors.password}
                        onChange={(e) => setAccount({ ...account, password: e.target.value })}
                        autoComplete="new-password"
                      />
                    )}
                  </Field>
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <h1 className="font-display text-3xl font-semibold">Tell us where you're at</h1>
                <p className="mt-2 font-body text-sm text-muted">
                  Step 2 of 3 — honest answers only; this shapes how we teach you.
                </p>
                <div className="mt-12 flex flex-col gap-12">
                  {QUESTION_META.map((q) => (
                    <fieldset key={q.id} className="border-0 p-0">
                      <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        {q.id.toUpperCase()} · {q.label}
                        {!q.required && <span className="ml-2 text-faint">(optional)</span>}
                        {q.type === 'multi' && (
                          <span className="mt-1 block font-body text-xs font-normal normal-case tracking-normal text-accent-dim">
                            Choose all that apply
                          </span>
                        )}
                      </legend>

                      {q.type === 'single' && (
                        <SingleChoice
                          options={q.options ?? []}
                          value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                          onChange={(v) => setAnswer(q.id, v)}
                          invalid={!!errors[q.id]}
                          name={q.id}
                        />
                      )}
                      {q.type === 'multi' && (
                        <MultiChoice
                          options={q.options ?? []}
                          values={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []}
                          onToggle={(opt) => {
                            const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                            setAnswer(
                              q.id,
                              cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt],
                            );
                          }}
                          invalid={!!errors[q.id]}
                        />
                      )}
                      {q.type === 'text' && (
                        <Textarea
                          value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                          invalid={!!errors[q.id]}
                          placeholder={q.placeholder}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                        />
                      )}
                      {errors[q.id] && (
                        <p role="alert" className="mt-2 font-mono text-xs text-danger">
                          // {errors[q.id]}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h1 className="font-display text-3xl font-semibold">Review & submit</h1>
                <p className="mt-2 font-body text-sm text-muted">
                  Step 3 of 3 — double-check before it lands in the review queue.
                </p>
                <dl className="mt-10 divide-y divide-line border-y border-line">
                  {[
                    ['Name', account.name],
                    ['Email', account.email],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-4">
                      <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">{k}</dt>
                      <dd className="font-body text-sm">{v}</dd>
                    </div>
                  ))}
                  {QUESTION_META.map((q) => (
                    <div key={q.id} className="grid grid-cols-[140px_1fr] gap-4 py-4">
                      <dt className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
                        {q.id.toUpperCase()}
                      </dt>
                      <dd className="font-body text-sm text-muted">
                        {Array.isArray(answerList[q.id])
                          ? (answerList[q.id] as string[]).join(', ') || '—'
                          : (answerList[q.id] as string) || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* controls */}
        <div className="mt-14 flex items-center justify-between border-t border-line pt-8">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={goNext}>
              Continue <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function SingleChoice({
  options,
  value,
  onChange,
  invalid,
  name,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  name: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2')} role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            'border px-4 py-2 font-body text-sm transition-colors',
            value === opt
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-inset text-muted hover:border-line-strong hover:text-ink',
            invalid && value === '' && 'border-danger/50',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MultiChoice({
  options,
  values,
  onToggle,
  invalid,
}: {
  options: readonly string[];
  values: string[];
  onToggle: (opt: string) => void;
  invalid: boolean;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2')} role="group" aria-label="Choose all that apply">
      {options.map((opt) => {
        const selected = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(opt)}
            className={cn(
              'flex items-center gap-2 border px-4 py-2 font-body text-sm transition-colors',
              selected
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-inset text-muted hover:border-line-strong hover:text-ink',
              invalid && values.length === 0 && 'border-danger/50',
            )}
          >
            {/* checkbox-style marker signals multi-select */}
            <span
              aria-hidden
              className={cn(
                'flex size-4 shrink-0 items-center justify-center border',
                selected ? 'border-accent-ink bg-accent-ink' : 'border-line-strong bg-canvas',
              )}
            >
              {selected && <Check className="size-3 text-accent" />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
