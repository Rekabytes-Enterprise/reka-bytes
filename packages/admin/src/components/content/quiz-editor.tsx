'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, isApiClientError, type QuizAdminDTO } from '@reka-bytes/shared';
import { usePushToast } from '@/components/system/toaster';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface DraftQuestion {
  id?: string; // present → editing an existing question
  question: string;
  options: string[];
  correctIndex: number;
}

const emptyDraft = (): DraftQuestion => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
});

export function QuizEditor({ quizId }: { quizId: string }) {
  const pushToast = usePushToast();
  const [quiz, setQuiz] = useState<QuizAdminDTO | null>(null);
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState('80');
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // No flat quiz endpoint — locate it by scanning classes (small dataset).
        const classes = await apiFetch<Array<{ id: string }>>('/api/admin/classes');
        for (const c of classes) {
          const tree = await apiFetch<{
            modules: Array<{ quiz: QuizAdminDTO | null }>;
          }>(`/api/admin/classes/${c.id}`);
          const found = tree.modules.find((m) => m.quiz?.id === quizId)?.quiz;
          if (found && !cancelled) {
            setQuiz(found);
            setTitle(found.title);
            setPassingScore(String(found.passingScore));
            return;
          }
        }
        if (!cancelled) pushToast({ variant: 'error', title: 'Quiz not found' });
      } catch (e) {
        if (!cancelled)
          pushToast({ variant: 'error', title: e instanceof Error ? e.message : 'Load failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId, pushToast]);

  async function call(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn();
      pushToast({ variant: 'success', title: okMsg });
      window.location.reload();
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Action failed' });
    }
  }

  if (!quiz)
    return (
      <p className="py-16 font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading…</p>
    );

  async function saveDraft() {
    if (!draft || !quiz) return;
    if (!draft.question.trim() || draft.options.some((o) => !o.trim())) {
      pushToast({ variant: 'error', title: 'Question and all options are required' });
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await apiFetch(`/api/admin/questions/${draft.id}`, {
          method: 'PUT',
          body: {
            question: draft.question.trim(),
            options: draft.options.map((o) => o.trim()),
            correctIndex: draft.correctIndex,
          },
        });
      } else {
        await apiFetch(`/api/admin/quizzes/${quiz.id}/questions`, {
          method: 'POST',
          body: {
            question: draft.question.trim(),
            options: draft.options.map((o) => o.trim()),
            correctIndex: draft.correctIndex,
          },
        });
      }
      pushToast({ variant: 'success', title: draft.id ? 'Question updated' : 'Question added' });
      window.location.reload();
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Save failed' });
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[900px] px-6 py-16">
      <Link
        href="/content"
        className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-accent"
      >
        ← content manager
      </Link>

      <header className="mt-4 border border-line bg-elevated p-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex-1">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Quiz title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
            />
          </label>
          <label>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Pass %
            </span>
            <input
              type="number"
              min={50}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              className="mt-1 w-24 border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              void call(
                () =>
                  apiFetch(`/api/admin/quizzes/${quiz.id}`, {
                    method: 'PUT',
                    body: { title: title.trim(), passingScore: Number(passingScore) || 80 },
                  }),
                'Quiz saved',
              )
            }
            className="border border-line-strong px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
          >
            save settings
          </button>
        </div>
      </header>

      {/* Questions */}
      <ul className="mt-8 space-y-3" data-testid="question-list">
        {quiz.questions.map((q, qi) => (
          <li
            key={q.id}
            className="border border-line bg-elevated p-5"
            data-testid={`question-row-${q.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-faint">Q{qi + 1}</p>
                <p className="mt-1 font-body text-sm font-medium">{q.question}</p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={`font-body text-xs ${oi === q.correctIndex ? 'text-success' : 'text-muted'}`}
                    >
                      {String.fromCharCode(65 + oi)}) {opt} {oi === q.correctIndex ? '✓' : ''}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: q.id,
                      question: q.question,
                      options: [...q.options],
                      correctIndex: q.correctIndex,
                    })
                  }
                  className="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline"
                >
                  edit
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionToDelete(q.id)}
                  className="font-mono text-xs uppercase tracking-[0.12em] text-danger hover:underline"
                >
                  delete
                </button>
              </div>
            </div>
          </li>
        ))}
        {quiz.questions.length === 0 && (
          <li className="py-4 font-mono text-xs uppercase tracking-[0.12em] text-faint">
            // no questions yet
          </li>
        )}
      </ul>

      {!draft && (
        <button
          type="button"
          onClick={() => setDraft(emptyDraft())}
          data-testid="add-question-btn"
          className="mt-6 bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover"
        >
          + add question
        </button>
      )}

      {/* Question editor */}
      {draft && (
        <section
          className="mt-8 border border-accent/40 bg-elevated p-6"
          data-testid="question-editor"
        >
          <h2 className="font-display text-lg font-semibold">
            {draft.id ? 'Edit question' : 'New question'}
          </h2>
          <label className="mt-4 block">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Question
            </span>
            <textarea
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              rows={2}
              className="mt-1 w-full resize-y border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
            />
          </label>
          <fieldset className="mt-4">
            <legend className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Options — pick the radio of the correct answer
            </legend>
            <div className="mt-2 grid gap-2">
              {draft.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-answer"
                    aria-label={`Option ${String.fromCharCode(65 + oi)} is correct`}
                    checked={draft.correctIndex === oi}
                    onChange={() => setDraft({ ...draft, correctIndex: oi })}
                    data-testid={`correct-radio-${oi}`}
                    className="accent-[#c6ff4a]"
                  />
                  <input
                    value={opt}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        options: draft.options.map((o, i) => (i === oi ? e.target.value : o)),
                      })
                    }
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    className="w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              data-testid="question-save-btn"
              className="bg-accent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover disabled:opacity-40"
            >
              {saving ? 'saving…' : 'save question'}
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!questionToDelete}
        title="Delete this question?"
        description="The question is removed from the quiz immediately."
        confirmLabel="Delete question"
        onConfirm={async () => {
          if (!questionToDelete) return;
          const id = questionToDelete;
          setQuestionToDelete(null);
          await apiFetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
          pushToast({ variant: 'success', title: 'Question deleted' });
          window.location.reload();
        }}
        onClose={() => setQuestionToDelete(null)}
      />
    </main>
  );
}
