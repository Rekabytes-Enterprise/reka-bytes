'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch, isApiClientError, type LessonDTO } from '@reka-bytes/shared';
import { usePushToast } from '@/components/system/toaster';
import { Markdown } from '@/components/content/markdown';

export interface LessonEditorProps {
  moduleId: string;
  lesson?: LessonDTO | null; // null → create mode
  onSaved: () => void;
  onClose: () => void;
}

/** Create/edit a lesson — markdown textarea with raw/preview toggle. */
export function LessonEditor({ moduleId, lesson, onSaved, onClose }: LessonEditorProps) {
  const pushToast = usePushToast();
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [content, setContent] = useState(lesson?.contentMarkdown ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? '');
  const [duration, setDuration] = useState(String(lesson?.durationMinutes ?? 10));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !content.trim()) {
      pushToast({ variant: 'error', title: 'Title and content are required' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        contentMarkdown: content,
        videoUrl: videoUrl.trim() === '' ? undefined : videoUrl.trim(),
        durationMinutes: Number(duration) || 10,
      };
      if (lesson) {
        await apiFetch(`/api/admin/lessons/${lesson.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/admin/lessons', {
          method: 'POST',
          body: { ...body, moduleId },
        });
      }
      pushToast({ variant: 'success', title: lesson ? 'Lesson updated' : 'Lesson created' });
      onSaved();
    } catch (e) {
      pushToast({ variant: 'error', title: isApiClientError(e) ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  // testid kept for E2E-11 continuity; now an inline panel, not a modal
  return (
    <div className="mt-4 border border-accent/40 bg-elevated p-5" data-testid="lesson-editor-modal">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">
          {lesson ? 'Edit Lesson' : 'New Lesson'}
        </h3>
        <button
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          className="p-1 text-faint transition-colors hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="lesson-title-input"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Duration (min)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">Video URL (YouTube)</span>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Content (markdown)
            </span>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              data-testid="lesson-preview-toggle"
              className="font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline"
            >
              {preview ? '[ edit raw ]' : '[ preview ]'}
            </button>
          </div>
          {preview ? (
            <div className="mt-1 min-h-64 max-h-[50dvh] overflow-y-auto border border-line bg-canvas p-4" data-testid="lesson-preview-pane">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              data-testid="lesson-markdown-input"
              className="mt-1 w-full resize-y border border-line bg-canvas px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-accent"
            />
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">
          cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          data-testid="lesson-save-btn"
          className="bg-accent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {saving ? 'saving…' : 'save lesson'}
        </button>
      </div>
    </div>
  );
}
