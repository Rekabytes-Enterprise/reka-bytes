'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, ListChecks, Plus, Trash2 } from 'lucide-react';
import { apiFetch, isApiClientError, type ClassTreeDTO, type LessonDTO } from '@reka-bytes/shared';
import { usePushToast } from '@/components/system/toaster';
import { useAdminQuery } from '@/hooks/api-query';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LessonEditor } from '@/components/content/lesson-editor';
import { InlineText } from '@/components/ui/inline-edit';

const iconBtn = 'p-1.5 text-faint transition-colors hover:text-accent';

export function ClassDetail({ classId }: { classId: string }) {
  const pushToast = usePushToast();
  const [title, setTitle] = useState('');
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: LessonDTO | null } | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'module'; module: { id: string; title: string } } | { kind: 'lesson'; lesson: { id: string; title: string } } | null>(null);

  // Server state via useAdminQuery (jotai atom); mutations refetch via reload().
  const { data: cls, loading, reload } = useAdminQuery<ClassTreeDTO>(`/api/admin/classes/${classId}`);

  // Sync the editable title field when fresh data arrives (local edit state).
  useEffect(() => {
    if (cls) setTitle(cls.title);
  }, [cls]);

  async function call<T>(fn: () => Promise<T>, okMsg?: string) {
    try {
      await fn();
      if (okMsg) pushToast({ variant: 'success', title: okMsg });
      reload();
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Action failed' });
    }
  }

  const c = cls;
  function reorderLessons(moduleId: string, index: number, dir: -1 | 1) {
    if (!c) return;
    const mod = c.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const j = index + dir;
    if (j < 0 || j >= mod.lessons.length) return;
    const items = mod.lessons.map((l, i) => ({ id: l.id, order: i === index ? j : i === j ? index : i }));
    void call(() => apiFetch('/api/admin/content/reorder', { method: 'POST', body: { type: 'lessons', items } }));
  }

  function reorderModules(index: number, dir: -1 | 1) {
    if (!c) return;
    const j = index + dir;
    if (j < 0 || j >= c.modules.length) return;
    const items = c.modules.map((m, i) => ({ id: m.id, order: i === index ? j : i === j ? index : i }));
    void call(() => apiFetch('/api/admin/content/reorder', { method: 'POST', body: { type: 'modules', items } }));
  }

  if (loading || !cls) return <p className="py-16 font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading…</p>;

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-16 lg:px-10">
      <Link href="/content" className="font-mono text-xs uppercase tracking-[0.12em] text-faint hover:text-accent">
        ← content manager
      </Link>

      {/* Class header + settings */}
      <header className="mt-4 border border-line bg-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <label className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Class title</label>
            <div className="mt-1 flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="class-detail-title"
                className="w-full max-w-md border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => void call(() => apiFetch(`/api/admin/classes/${cls.id}`, { method: 'PUT', body: { title } }), 'Class saved')}
                className="border border-line-strong px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
              >
                save
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              void call(
                () =>
                  apiFetch(`/api/admin/classes/${cls.id}`, {
                    method: 'PUT',
                    body: { published: !cls.published },
                  }),
                cls.published ? 'Unpublished' : 'Published',
              )
            }
            data-testid="class-publish-toggle"
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
              cls.published ? 'bg-success/15 text-success' : 'bg-accent text-accent-ink hover:bg-accent-hover'
            }`}
          >
            {cls.published ? (
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} aria-hidden /> published — unpublish
              </span>
            ) : (
              'publish class'
            )}
          </button>
        </div>
      </header>

      {/* Modules */}
      <ul className="mt-8 space-y-6" data-testid="module-list">
        {cls.modules.map((mod, mi) => (
          <li key={mod.id} className="border border-line bg-elevated p-6" data-testid={`module-${mod.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">
                <InlineText
                  value={mod.title}
                  editLabel="Rename module"
                  className="font-display text-lg font-semibold"
                  onSave={async (next) => {
                    await call(
                      () => apiFetch(`/api/admin/modules/${mod.id}`, { method: 'PUT', body: { title: next } }),
                      'Module renamed',
                    );
                  }}
                />
              </h2>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Move module up" className={iconBtn} onClick={() => reorderModules(mi, -1)}>
                  <ArrowUp size={15} />
                </button>
                <button type="button" aria-label="Move module down" className={iconBtn} onClick={() => reorderModules(mi, 1)}>
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Delete module"
                  className={`${iconBtn} hover:!text-danger`}
                  onClick={() => setPendingDelete({ kind: 'module', module: mod })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Lessons */}
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {mod.lessons.map((lesson, li) => (
                <li key={lesson.id} className="flex items-center justify-between gap-3 py-3" data-testid={`lesson-row-${lesson.id}`}>
                  <span className="flex min-w-0 items-center gap-3 pl-2">
                    <span className="font-mono text-xs text-faint">{String(li + 1).padStart(2, '0')}</span>
                    <span className="truncate font-body text-sm">{lesson.title}</span>
                    <span className="shrink-0 font-mono text-xs text-faint">{lesson.durationMinutes} min</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="Move lesson up" className={iconBtn} onClick={() => reorderLessons(mod.id, li, -1)}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" aria-label="Move lesson down" className={iconBtn} onClick={() => reorderLessons(mod.id, li, 1)}>
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" aria-label="Edit lesson" className={iconBtn} onClick={() => setEditingLesson({ moduleId: mod.id, lesson })}>
                      <ListChecks size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete lesson"
                      className={`${iconBtn} hover:!text-danger`}
                      onClick={() => setPendingDelete({ kind: 'lesson', lesson })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
              {/* Inline lesson editor (edit mode) */}
              {editingLesson?.lesson?.id && editingLesson.moduleId === mod.id && (
                <li className="py-2">
                  <LessonEditor
                    moduleId={mod.id}
                    lesson={editingLesson.lesson}
                    onSaved={() => {
                      setEditingLesson(null);
                      reload();
                    }}
                    onClose={() => setEditingLesson(null)}
                  />
                </li>
              )}
              {mod.lessons.length === 0 && !editingLesson && (
                <li className="py-3 font-mono text-xs uppercase tracking-[0.12em] text-faint">// no lessons yet</li>
              )}
            </ul>

            {/* Inline lesson editor (create mode) */}
            {editingLesson?.lesson === null && editingLesson.moduleId === mod.id && (
              <div className="mt-4">
                <LessonEditor
                  moduleId={mod.id}
                  lesson={null}
                  onSaved={() => {
                    setEditingLesson(null);
                    reload();
                  }}
                  onClose={() => setEditingLesson(null)}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditingLesson({ moduleId: mod.id, lesson: null })}
                className="flex items-center gap-1 border border-line-strong px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
              >
                <Plus size={13} /> add lesson
              </button>
              {mod.quiz ? (
                <Link
                  href={`/content/quizzes/${mod.quiz.id}`}
                  className="inline-flex items-center gap-1.5 border border-line-strong px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
                >
                  <ListChecks size={13} aria-hidden /> edit quiz ({mod.quiz.questions.length} Q)
                </Link>
              ) : (
                <Link
                  href={`/content/quizzes/new?moduleId=${mod.id}`}
                  data-testid={`create-quiz-${mod.id}`}
                  className="border border-line px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted hover:border-accent hover:text-accent"
                >
                  create quiz
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Add module */}
      <div className="mt-6 flex gap-2">
        <input
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          placeholder="New module title…"
          data-testid="new-module-input"
          className="w-full max-w-sm border border-line bg-elevated px-3 py-2 font-body text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            if (!newModuleTitle.trim()) return;
            void call(async () => {
              await apiFetch('/api/admin/modules', {
                method: 'POST',
                body: { classId: cls.id, title: newModuleTitle.trim() },
              });
              setNewModuleTitle('');
            }, 'Module added');
          }}
          className="border border-line-strong px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] hover:border-accent hover:text-accent"
        >
          + add module
        </button>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === 'module'
            ? `Delete "${pendingDelete.module.title}"?`
            : `Delete "${pendingDelete?.lesson.title}"?`
        }
        description={
          pendingDelete?.kind === 'module'
            ? 'All its lessons and quiz will be deleted too. This cannot be undone.'
            : 'Student progress for this lesson will be deleted.'
        }
        confirmLabel={pendingDelete?.kind === 'module' ? 'Delete module' : 'Delete lesson'}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const pd = pendingDelete;
          setPendingDelete(null);
          if (pd.kind === 'module') {
            void call(() => apiFetch(`/api/admin/modules/${pd.module.id}`, { method: 'DELETE' }), 'Module deleted');
          } else {
            void call(() => apiFetch(`/api/admin/lessons/${pd.lesson.id}`, { method: 'DELETE' }), 'Lesson deleted');
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </main>
  );
}
