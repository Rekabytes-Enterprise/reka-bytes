'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { ApiEnvelope } from '@reka-bytes/shared';
import { WizardShell } from '@/components/ai/wizard-shell';
import { useAIWizard } from '@/components/ai/state';

const MAX_BYTES = 50 * 1024 * 1024;

function friendlyHttpError(status: number): string {
  if (status === 413) return 'File too large for the server';
  if (status === 401 || status === 403) return 'Session expired — sign in again';
  return `Upload failed (HTTP ${status})`;
}

export default function Step1Page() {
  const router = useRouter();
  const wizard = useAIWizard();
  const [file, setFile] = useState<File | null>(null);
  const [classTitle, setClassTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = Boolean(file && classTitle.trim()) && !busy;

  function pick(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF files only for now');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File too large — 50MB max');
      return;
    }
    setFile(f);
  }

  async function start() {
    if (!file || !classTitle.trim()) {
      setError('A PDF and a class title are required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Raw fetch — apiFetch is JSON-only; multipart must not set Content-Type manually.
      const fd = new FormData();
      fd.append('file', file);
      fd.append('classTitle', classTitle.trim());
      const res = await fetch('/api/admin/ai/masterclass/generate', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      let json: ApiEnvelope<{ jobId: string }> | null = null;
      try {
        json = (await res.json()) as ApiEnvelope<{ jobId: string }>;
      } catch {
        // non-JSON body (proxy/HTML error page)
      }

      if (!res.ok || !json || 'error' in json || !json.data?.jobId) {
        throw new Error(
          json && 'error' in json ? json.error.message : friendlyHttpError(res.status),
        );
      }

      wizard.setClassTitle(classTitle.trim());
      wizard.setJobId(json.data.jobId);
      router.push('/ai-masterclass/step/2');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setBusy(false);
    }
  }

  return (
    <WizardShell step={1}>
      <div className="mx-auto max-w-[720px]">
        <div className="border border-line bg-elevated p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0] ?? null);
            }}
            className="border border-dashed border-line-strong p-10 text-center"
            data-testid="ai-file-input"
          >
            <p className="font-body text-sm text-muted">
              <FileText size={16} className="mr-2 inline text-faint" aria-hidden />
              Drag &amp; drop your curriculum PDF here
            </p>
            <label className="mt-4 inline-block cursor-pointer border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent">
              browse files
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-3 font-mono text-xs text-faint">
              {file
                ? `selected: ${file.name} (${Math.round(file.size / 1024)} KB)`
                : 'max 50MB · PDF only'}
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="ai-class-title"
              className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint"
            >
              Class title
            </label>
            <input
              id="ai-class-title"
              value={classTitle}
              onChange={(e) => {
                setError(null);
                setClassTitle(e.target.value);
              }}
              data-testid="ai-class-title"
              placeholder="Basics of Vibe Coding"
              className="mt-1 w-full border border-line bg-inset px-3 py-2 font-body text-sm outline-none focus:border-accent placeholder:font-mono placeholder:text-faint"
            />
          </div>

          {error && (
            <p className="mt-4 font-mono text-xs text-danger" data-testid="ai-step1-error">
              {error}
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          <p className="font-mono text-xs text-faint">
            the AI drafts modules, lessons &amp; a quiz
          </p>
          <button
            type="button"
            onClick={start}
            disabled={!ready}
            data-testid="ai-generate-btn"
            className="bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'uploading…' : 'analyze with AI →'}
          </button>
        </div>
      </div>
    </WizardShell>
  );
}
