'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ClipboardList, ListChecks, RefreshCw } from 'lucide-react';
import { apiFetch, isApiClientError, type AIGenJobStatusDTO, type AIAnalysisDTO, type ClassTreeDTO } from '@reka-bytes/shared';
import { WizardShell } from '@/components/ai/wizard-shell';
import { useAIWizard } from '@/components/ai/state';
import { usePushToast } from '@/components/system/toaster';
import { InlineText } from '@/components/ui/inline-edit';
import { AnalysisPanel } from '@/components/ai/analysis-panel';

/** Step 4 — review the AI-generated tree; inline lesson title edits. */
export default function Step4Page() {
  const router = useRouter();
  const wizard = useAIWizard();
  const pushToast = usePushToast();
  const [cls, setCls] = useState<ClassTreeDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisDTO | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null); // lessonId
  const classId = wizard.classId;

  useEffect(() => {
    if (!wizard.hydrated) return;
    if (!classId) {
      router.replace('/ai-masterclass/step/1');
      return;
    }
    let cancelled = false;
    apiFetch<ClassTreeDTO>(`/api/admin/ai/masterclass/preview/${classId}`)
      .then((c) => {
        if (!cancelled) setCls(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(isApiClientError(e) ? e.message : 'Preview failed');
      });
    // Analysis comes from the generation job (may have expired — optional).
    if (wizard.jobId) {
      apiFetch<AIGenJobStatusDTO>(`/api/admin/ai/masterclass/status/${wizard.jobId}`)
        .then((j) => {
          if (!cancelled) setAnalysis(j.analysis);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [wizard.hydrated, classId, wizard.jobId, router]);

  async function renameLesson(lessonId: string, next: string) {
    try {
      await apiFetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        body: { title: next },
      });
      pushToast({ variant: 'success', title: 'Lesson renamed' });
      setCls(
        (prev) =>
          prev && {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, title: next } : l)),
            })),
          },
      );
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Rename failed' });
      throw e; // re-throw so InlineText stays in edit mode
    }
  }

  /** Regenerate one lesson from the original PDF chunks, then save it. */
  async function regenerateLesson(lessonId: string) {
    setRegenerating(lessonId);
    try {
      const regenerated = await apiFetch<{ blocks: unknown[] | null; contentMarkdown: string }>(
        `/api/admin/ai/masterclass/regenerate-lesson/${lessonId}`,
        { method: 'POST', body: wizard.jobId ? { jobId: wizard.jobId } : {} },
      );
      await apiFetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        body: { contentMarkdown: regenerated.contentMarkdown, blocks: regenerated.blocks ?? [] },
      });
      pushToast({ variant: 'success', title: 'Lesson regenerated' });
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Regeneration failed' });
    } finally {
      setRegenerating(null);
    }
  }

  return (
    <WizardShell step={4}>
      {error ? (
        <p className="font-mono text-xs text-danger">{error}</p>
      ) : !cls ? (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading preview…</p>
      ) : (
        <>
          <p
            className="font-mono text-xs uppercase tracking-[0.12em] text-accent-dim"
            data-testid="ai-review-summary"
          >
            <ClipboardList size={13} className="mr-1.5 inline text-accent" aria-hidden />
            {cls.modules.length} modules ·{' '}
            {cls.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons ·{' '}
            {cls.modules.filter((m) => m.quiz).length} quizzes generated
          </p>

          {analysis && <AnalysisPanel analysis={analysis} defaultOpen={false} />}

          <ul className="mt-6 space-y-4">
            {cls.modules.map((mod, i) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                defaultOpen={i === 0}
                regenerating={regenerating}
                onRename={renameLesson}
                onRegenerate={(lessonId) => void regenerateLesson(lessonId)}
              />
            ))}
          </ul>

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <p className="font-mono text-xs text-faint">titles are editable inline before publish</p>
            <button
              type="button"
              onClick={() => router.push('/ai-masterclass/step/5')}
              data-testid="ai-review-continue"
              className="bg-accent px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover"
            >
              looks good →
            </button>
          </div>
        </>
      )}
    </WizardShell>
  );
}

interface ModuleCardProps {
  module: ClassTreeDTO['modules'][number];
  defaultOpen: boolean;
  regenerating: string | null;
  onRename: (lessonId: string, next: string) => Promise<void>;
  onRegenerate: (lessonId: string) => void;
}

/** Collapsible module card — header summarizes, body lists lessons + quiz. */
function ModuleCard({ module: mod, defaultOpen, regenerating, onRename, onRegenerate }: ModuleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="border border-line bg-elevated">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-inset"
      >
        <span className="font-body text-sm font-semibold text-ink">
          <ChevronDown
            size={14}
            className={`mr-1.5 inline text-faint transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
          {mod.title}
        </span>
        <span className="font-mono text-xs text-faint">
          {mod.lessons.length} lesson{mod.lessons.length === 1 ? '' : 's'}
          {mod.quiz ? ' · 1 quiz' : ''}
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-6 py-4">
          <ul className="space-y-1">
            {mod.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-3 border-b border-line/50 py-2 font-body text-xs text-muted last:border-b-0"
              >
                <Check size={12} className="shrink-0 text-success" aria-hidden />
                <InlineText value={lesson.title} editLabel="edit" onSave={(next) => onRename(lesson.id, next)} />
                <span className="shrink-0 font-mono text-faint">{lesson.durationMinutes} min</span>
                <button
                  type="button"
                  aria-label={`regenerate ${lesson.title}`}
                  title="Regenerate this lesson from the PDF"
                  disabled={regenerating !== null}
                  onClick={() => onRegenerate(lesson.id)}
                  data-testid="ai-regen-lesson"
                  className="shrink-0 p-1 text-faint transition-colors hover:text-accent disabled:opacity-40"
                >
                  <RefreshCw
                    size={13}
                    className={regenerating === lesson.id ? 'animate-spin' : ''}
                    aria-hidden
                  />
                </button>
              </li>
            ))}
            {mod.quiz && (
              <li className="pt-3 font-body text-xs text-muted">
                <ListChecks size={13} className="mr-1.5 inline text-faint" aria-hidden />
                {mod.quiz.title} ({mod.quiz.questions.length} questions)
              </li>
            )}
          </ul>
        </div>
      )}
    </li>
  );
}
