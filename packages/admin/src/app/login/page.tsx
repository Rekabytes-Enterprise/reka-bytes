'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, isApiClientError, type SessionUser } from '@reka-bytes/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { usePushToast } from '@/components/system/toaster';

export default function AdminLoginPage() {
  const router = useRouter();
  const pushToast = usePushToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setErrors({
        ...(email ? {} : { email: 'Required' }),
        ...(password ? {} : { password: 'Required' }),
      });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const user = await apiFetch<SessionUser>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (user.role !== 'ADMIN') {
        pushToast({ variant: 'error', title: 'This account is not an admin' });
        await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        return;
      }
      router.push('/');
    } catch (err) {
      if (isApiClientError(err)) {
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
        reka·bytes / admin
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold">Internal console</h1>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6" noValidate>
        <Field label="Admin email" error={errors.email}>
          {(id) => (
            <Input
              id={id}
              type="email"
              value={email}
              invalid={!!errors.email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="admin-email"
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
              data-testid="admin-password"
            />
          )}
        </Field>
        <Button type="submit" disabled={submitting} data-testid="admin-login-submit">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
