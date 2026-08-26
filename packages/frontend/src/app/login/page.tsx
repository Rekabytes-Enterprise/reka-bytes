'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { loginSchema, apiFetch, isApiClientError, type SessionUser } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { usePushToast } from '@/components/system/toaster';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSetAtom(sessionAtom);
  const pushToast = usePushToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
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
      const user = await apiFetch<SessionUser>('/api/auth/login', {
        method: 'POST',
        body: parsed.data,
      });
      setSession(user);
      router.push('/status');
    } catch (err) {
      if (isApiClientError(err)) {
        if (err.details) {
          setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? ''])));
        }
        pushToast({ variant: 'error', title: err.message });
      } else {
        pushToast({ variant: 'error', title: 'Login failed — try again' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">
        reka·bytes / login
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold">Check your status</h1>

      <form onSubmit={onSubmit} className="mt-12 flex flex-col gap-6" noValidate>
        <Field label="Email" error={errors.email}>
          {(id) => (
            <Input
              id={id}
              type="email"
              value={email}
              invalid={!!errors.email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              data-testid="login-email"
            />
          )}
        </Field>
        <Field label="Password" error={errors.password}>
          {(id) => (
            <Input
              id={id}
              type="password"
              value={password}
              invalid={!!errors.password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              data-testid="login-password"
            />
          )}
        </Field>
        <Button type="submit" disabled={submitting} data-testid="login-submit">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-10 font-mono text-xs uppercase tracking-[0.12em] text-faint">
        No account yet?{' '}
        <Link href="/register" className="text-accent hover:underline">
          register
        </Link>
      </p>
      <Link href="/" className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-muted">
        ← back home
      </Link>
    </main>
  );
}
