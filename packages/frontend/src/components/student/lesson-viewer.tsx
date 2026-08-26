'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiFetch, type LessonDetailDTO } from '@reka-bytes/shared';
import { Markdown } from '@/components/student/markdown';
import { BlockRenderer } from '@/components/student/blocks/block-renderer';
import { toYouTubeEmbed } from '@/components/student/youtube-embed';
import { useApiQuery } from '@/hooks/api-query';
import { useToastError } from '@/components/system/toaster';
import { fireConfetti, showXpToast } from '@/lib/celebrations';

export function LessonViewer({ lessonId }: { lessonId: string }) {
  const { data: lesson } = useApiQuery<LessonDetailDTO>(`/api/learn/lessons/${lessonId}`);
  const toastError = useToastError();
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Track completion as local state (flipped by mark-complete AND auto-complete callback).
  // Re-sync if the lesson changes id (navigated to a new lesson).
  useEffect(() => {
    if (lesson) setCompleted(lesson.completedAt !== null);
  }, [lessonId, lesson]);

  const markComplete = async () => {
    if (!lesson || completing) return;
    setCompleting(true);
    try {
      await apiFetch(`/api/learn/lessons/${lesson.id}/complete`, { method: 'POST' });
      setCompleted(true);
      void fireConfetti();
      showXpToast(50, { celebrate: true, label: 'lesson' });
    } catch (e) {
      toastError(e, 'Failed to mark lesson complete');
    } finally {
      setCompleting(false);
    }
  };

  if (!lesson) {
    return <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading lesson…</p>;
  }

  const embed = toYouTubeEmbed(lesson.videoUrl);

  return (
    <article data-testid="lesson-viewer">
      {/* Top nav — sticky so prev/next are always reachable on long lessons */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/95 py-4 backdrop-blur-sm">
        <Link
          href="/learn"
          data-testid="back-to-learn"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
        >
          ← back to learn
        </Link>
        <div className="flex gap-2">
          {lesson.prevLessonId && (
            <Link
              href={`/learn/${lesson.prevLessonId}`}
              data-testid="prev-lesson"
              className="flex items-center gap-1 rounded-full border border-line px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <ArrowLeft size={13} /> prev
            </Link>
          )}
          {lesson.nextLessonId && (
            <Link
              href={`/learn/${lesson.nextLessonId}`}
              data-testid="next-lesson"
              className="flex items-center gap-1 rounded-full border border-line-strong bg-elevated px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
            >
              next <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="pt-8">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
          {lesson.classTitle} · {lesson.moduleTitle} · {lesson.durationMinutes} min
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">{lesson.title}</h1>
      </header>

      {/* Video */}
      {embed && (
        <div className="mt-8 aspect-video w-full overflow-hidden rounded-card border border-line bg-inset shadow-card" data-testid="lesson-video">
          <iframe
            src={embed}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {/* Content — typed blocks when present, legacy markdown otherwise (LESSON-PLAN §4.2) */}
      <div className="mt-8 max-w-[72ch]" data-testid="lesson-content">
        {lesson.blocks && lesson.blocks.length > 0 ? (
          <BlockRenderer
            blocks={lesson.blocks}
            lessonId={lesson.id}
            onLessonCompleted={() => {
              setCompleted(true);
              void fireConfetti();
              showXpToast(50, { celebrate: true, label: 'lesson' });
            }}
          />
        ) : (
          <Markdown>{lesson.contentMarkdown}</Markdown>
        )}
      </div>

      {/* Mark complete */}
      <div className="mt-10 border-t border-line pt-8">
        <button
          type="button"
          onClick={markComplete}
          disabled={completed || completing}
          data-testid="mark-complete"
          className={`inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5 ${
            completed
              ? 'cursor-default bg-success/10 text-success'
              : 'bg-accent text-accent-ink shadow-lift hover:bg-accent-hover'
          }`}
        >
          <Check size={14} strokeWidth={3} />
          {completed ? 'completed ✓' : completing ? 'saving…' : 'mark as complete'}
        </button>

        {/* Quiz CTA */}
        {lesson.quiz && (
          <div className="card-surface mt-8 flex flex-wrap items-center justify-between gap-4 p-5" data-testid="quiz-cta">
            <div>
              <p className="font-body text-sm font-medium">📝 {lesson.quiz.title}</p>
              <p className="font-mono text-xs text-faint">
                {lesson.quiz.questionCount} questions · pass at {lesson.quiz.passingScore}%
              </p>
            </div>
            <Link
              href={`/learn/quiz/${lesson.quiz.id}`}
              className="rounded-full border border-line-strong px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
            >
              take quiz →
            </Link>
          </div>
        )}
      </div>

      {/* Bottom prev/next — no scrolling back up needed when finishing a lesson */}
      <nav className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-8" data-testid="bottom-nav">
        {lesson.prevLessonId ? (
          <Link
            href={`/learn/${lesson.prevLessonId}`}
            data-testid="prev-lesson-bottom"
            className="flex items-center gap-2 rounded-full border border-line px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <ArrowLeft size={13} /> prev lesson
          </Link>
        ) : (
          <span />
        )}
        {lesson.nextLessonId && (
          <Link
            href={`/learn/${lesson.nextLessonId}`}
            data-testid="next-lesson-bottom"
            className="flex items-center gap-2 rounded-full border border-line-strong bg-elevated px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            next lesson <ArrowRight size={13} />
          </Link>
        )}
      </nav>
    </article>
  );
}
