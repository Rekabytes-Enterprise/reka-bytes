'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  apiFetch,
  isApiClientError,
  formatApiError,
  type LessonDTO,
  type WidgetBlock,
} from '@reka-bytes/shared';
import { usePushToast } from '@/components/system/toaster';
import { Markdown } from '@/components/content/markdown';

/** Admin scene preview — same sandbox contract as the student frame, but no
 *  review gate (this IS the review surface) and a fixed scrollable height. */
function AdminScenePreview({ block }: { block: WidgetBlock }) {
  return (
    <iframe
      data-testid="scene-preview"
      srcDoc={block.html}
      title={block.title}
      sandbox="allow-scripts"
      className="mt-2 h-80 w-full rounded-lg border border-line bg-white"
    />
  );
}

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
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="lesson-title-input"
            className="mt-1 w-full border border-line bg-canvas px-3 py-2 font-body text-sm outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Duration (min)
            </span>
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
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
              Video URL (YouTube)
            </span>
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
            <div
              className="mt-1 min-h-64 max-h-[50dvh] overflow-y-auto border border-line bg-canvas p-4"
              data-testid="lesson-preview-pane"
            >
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

        {/* Divergence notice (PRD-06 §8): block lessons render blocks to students —
            the markdown below is the legacy fallback path only. */}
        {lesson?.blocks && lesson.blocks.length > 0 && (
          <p
            className="font-mono text-[11px] leading-relaxed text-faint"
            data-testid="lesson-blocks-notice"
          >
            // this lesson renders from typed interactive blocks — markdown edits here only affect
            the legacy fallback. Scenes are managed below.
          </p>
        )}

        {lesson?.blocks && (
          <ScenesSection lesson={lesson} pushToast={pushToast} onSaved={onSaved} />
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
        >
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

/**
 * Scenes section (PRD-06 §8/R4): per-widget preview, read-only code view,
 * HTML edit, and the review acknowledge. Acknowledge persists IMMEDIATELY via
 * a blocks-only PUT — it asserts the admin reviewed the SAVED html, so it is
 * disabled while an html edit is unapplied. The backend keeps `reviewed` when
 * the html is unchanged and forces false on any edit (content.service.ts).
 */
function ScenesSection({
  lesson,
  pushToast,
  onSaved,
}: {
  lesson: LessonDTO;
  pushToast: ReturnType<typeof usePushToast>;
  onSaved: () => void;
}) {
  const widgets = (lesson.blocks ?? []).filter((b): b is WidgetBlock => b.type === 'widget');
  const [previewOpen, setPreviewOpen] = useState<Record<number, boolean>>({});
  const [codeOpen, setCodeOpen] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState<number | null>(null);
  // index → unapplied html draft; acknowledge is disabled while one exists.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  // index → locally-applied edits (html changed / review flipped). The main
  // Save button also persists these as part of the whole blocks array.
  const [local, setLocal] = useState<Record<number, WidgetBlock>>({});

  async function acknowledge(i: number, scene: WidgetBlock) {
    setBusy(i);
    try {
      // Match on html so only THIS scene flips, and any local edits that were
      // not applied do not leak into the persisted payload.
      const blocks = (lesson.blocks ?? []).map((b) =>
        b.type === 'widget' && b.html === scene.html && b.title === scene.title
          ? { ...b, reviewed: true }
          : b,
      );
      await apiFetch(`/api/admin/lessons/${lesson.id}`, { method: 'PUT', body: { blocks } });
      setLocal((s) => ({ ...s, [i]: { ...scene, reviewed: true } }));
      pushToast({ variant: 'success', title: 'Scene reviewed — now visible to students' });
      onSaved();
    } catch (err) {
      const e = formatApiError(err);
      pushToast({ variant: 'error', title: e.title, description: e.description });
    } finally {
      setBusy(null);
    }
  }

  function applyHtml(i: number, scene: WidgetBlock) {
    const html = drafts[i];
    if (html === undefined || html === scene.html) return;
    setLocal((s) => ({ ...s, [i]: { ...scene, html, reviewed: false } }));
    setDrafts((d) => ({ ...d, [i]: '' }));
    setCodeOpen((c) => ({ ...c, [i]: false }));
    pushToast({
      variant: 'info',
      title: 'HTML applied — save the lesson to persist; review resets on save',
    });
  }

  return (
    <div className="mt-2 border-t border-line pt-4">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
        Interactive scenes ({widgets.length})
      </p>
      {widgets.map((_, i) => {
        const scene = local[i] ?? widgets[i];
        if (!scene) return null;
        const hasDraft = (drafts[i] ?? '') !== '' && drafts[i] !== scene.html;
        return (
          <div
            key={i}
            data-testid={`lesson-scene-row-${i}`}
            className="mt-3 border border-line bg-canvas p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-body text-sm font-medium text-ink">{scene.title}</p>
                <p className="font-mono text-[11px] text-faint">
                  {scene.html.length.toLocaleString()} chars ·{' '}
                  {scene.reviewed ? (
                    <span className="text-success">reviewed</span>
                  ) : (
                    <span className="text-warning">awaiting review</span>
                  )}
                  {local[i] ? ' · unsaved local changes' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((p) => ({ ...p, [i]: !p[i] }))}
                  data-testid={`scene-preview-toggle-${i}`}
                  className="border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                >
                  {previewOpen[i] ? 'close preview' : 'preview'}
                </button>
                <button
                  type="button"
                  onClick={() => setCodeOpen((c) => ({ ...c, [i]: !c[i] }))}
                  data-testid={`scene-code-toggle-${i}`}
                  className="border border-line px-5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                >
                  {codeOpen[i] ? 'close html' : 'view html'}
                </button>
                <button
                  type="button"
                  disabled={busy === i || hasDraft || scene.reviewed}
                  onClick={() => acknowledge(i, scene)}
                  data-testid={`scene-acknowledge-${i}`}
                  className="bg-accent px-5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover disabled:opacity-40"
                >
                  {busy === i ? 'saving…' : scene.reviewed ? 'reviewed ✓' : 'mark reviewed'}
                </button>
              </div>
            </div>

            {previewOpen[i] && <AdminScenePreview block={scene} />}

            {codeOpen[i] && (
              <div className="mt-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
                  // scene html (self-contained document, CSP + reporter injected by the server)
                </p>
                <textarea
                  value={drafts[i] ?? scene.html}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                  rows={10}
                  spellCheck={false}
                  data-testid="scene-code-view"
                  className="mt-1 w-full resize-y border border-line bg-canvas px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-accent"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!hasDraft}
                    onClick={() => applyHtml(i, scene)}
                    className="border border-accent px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent hover:bg-elevated disabled:opacity-40"
                  >
                    apply html edit
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
