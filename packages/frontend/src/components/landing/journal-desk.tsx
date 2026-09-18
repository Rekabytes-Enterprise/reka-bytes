'use client';

/**
 * "From the desk" — the home page's journal promotion section (replaces the
 * old single featured card; PRD-07 §3.4 evolved). Interactive canvas desk
 * scene + editorial featured card + latest posts as tilt cards + an
 * accessible peek modal. Client-side reads via useApiQuery so `/` stays
 * prerender-safe (the v0.1.1 lesson). Featured-slot testid
 * `home-featured-journal` is FROZEN — e2e-19 asserts it and the featured
 * post's text; the testid moves with the featured card wherever it renders.
 */
import Link from 'next/link';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, MousePointerClick } from 'lucide-react';
import { typeStyles, type JournalListDTO, type JournalPostSummary } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/hooks/api-query';
import { useReducedMotion } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/landing/section-header';
import { JournalDeskModel } from '@/components/landing/journal-desk-model';

/** Cursor-following 3D tilt (CSS perspective — no libraries, reduced-motion gated). */
function useTilt(reducedMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'none';
    el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-2px)`;
  };
  const onPointerLeave = (): void => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 350ms ease-out';
    el.style.transform = '';
  };
  return { ref, onPointerMove, onPointerLeave };
}

export function JournalDesk() {
  const t = typeStyles;
  const reducedMotion = useReducedMotion();
  const [peek, setPeek] = useState<JournalPostSummary | null>(null);

  // 404-shaped null (no featured post) is a normal answer — don't toast it.
  const { data: featured } = useApiQuery<JournalPostSummary | null>('/api/public/posts/featured', {
    toastError: false,
  });
  const { data: latest } = useApiQuery<JournalListDTO>('/api/public/posts?page=1&limit=4', {
    toastError: false,
  });
  const cards = (latest?.posts ?? []).filter((p) => p.slug !== featured?.slug).slice(0, 3);

  return (
    <section className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
      <SectionHeader name="FROM THE JOURNAL" title="The desk where the notes pile up." />
      <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
        Every build teaches something, and we write it down before it fades. The journal is the
        studio's open log — what shipped, what it cost, and the rule each mistake wrote into the
        codebase.
      </p>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
        {/* Desk scene */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden border border-line bg-inset">
            <JournalDeskModel className="h-[380px] w-full md:h-[470px]" />
            <p
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-line bg-canvas/85 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-faint"
            >
              <MousePointerClick className="size-3" aria-hidden /> drag to orbit
            </p>
          </div>
          <p className={cn(t.label, 'mt-4 text-faint')}>
            Every post is written by the founder, reviewed the way our code is — by commit.
          </p>
        </div>

        {/* Featured post — testid frozen for e2e-19 */}
        {featured && (
          <div
            data-testid="home-featured-journal"
            className="flex flex-col border border-line bg-elevated p-8 lg:col-span-7 lg:p-10"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent">
              {'// latest featured'}
            </p>
            <h3 className={cn(t.displayM, 'mt-4')}>
              <Link href={`/journal/${featured.slug}`} className="hover:text-accent">
                {featured.title}
              </Link>
            </h3>
            <p className={cn(t.bodySm, 'mt-4 flex-1 text-muted')}>{featured.excerpt}</p>
            <p className={cn(t.label, 'mt-6 text-faint')}>
              {featured.publishedAt} · ~{featured.readMinutes} min read
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <Link href={`/journal/${featured.slug}`}>
                <Button>
                  Read on the journal <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setPeek(featured)}>
                Peek inside
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Latest posts — tilt cards */}
      {cards.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((p) => (
            <li key={p.slug}>
              <JournalCard post={p} reducedMotion={reducedMotion} onPeek={() => setPeek(p)} />
            </li>
          ))}
        </ul>
      )}

      <PeekDialog post={peek} onClose={() => setPeek(null)} />
    </section>
  );
}

function JournalCard({
  post,
  reducedMotion,
  onPeek,
}: {
  post: JournalPostSummary;
  reducedMotion: boolean;
  onPeek: () => void;
}) {
  const t = typeStyles;
  const tilt = useTilt(reducedMotion);
  return (
    <div ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
      <article
        data-testid={`home-journal-card-${post.slug}`}
        className="flex h-full flex-col border border-line bg-elevated p-6 transition-colors hover:border-line-strong"
      >
        {post.coverImage && (
          <Link href={`/journal/${post.slug}`} className="block" tabIndex={-1} aria-hidden>
            <img
              src={post.coverImage}
              alt=""
              className="mb-5 aspect-video w-full rounded-lg border border-line object-cover"
            />
          </Link>
        )}
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
          {post.publishedAt} · ~{post.readMinutes} min
        </p>
        <h3 className={cn(t.headingS, 'mt-2')}>
          <Link href={`/journal/${post.slug}`} className="hover:text-accent">
            {post.title}
          </Link>
        </h3>
        <p className={cn(t.bodySm, 'mt-3 line-clamp-2 flex-1 text-muted')}>{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={onPeek}
            data-testid={`home-journal-peek-${post.slug}`}
          >
            <BookOpen className="size-3.5" aria-hidden /> Peek
          </Button>
          <Link
            href={`/journal/${post.slug}`}
            className={cn(t.label, 'text-accent underline-offset-4 hover:underline')}
          >
            Read →
          </Link>
        </div>
      </article>
    </div>
  );
}

/** Accessible "peek inside" modal — ConfirmDialog conventions, content-shaped. */
function PeekDialog({ post, onClose }: { post: JournalPostSummary | null; onClose: () => void }) {
  const t = typeStyles;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!post) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [post, onClose]);

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-peek-title"
        >
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 cursor-default bg-canvas/70"
            onClick={onClose}
            data-testid="journal-peek-backdrop"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto border border-line bg-elevated p-8"
            data-testid="journal-peek"
          >
            <div className="flex items-start justify-between gap-4">
              <p className={cn(t.label, 'text-accent')}>{'// from the journal'}</p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                data-testid="journal-peek-close"
                className="font-mono text-xs font-bold text-faint hover:text-ink"
              >
                ESC ✕
              </button>
            </div>
            <h2
              id="journal-peek-title"
              className={cn(
                t.headingS,
                'mt-4 text-2xl font-semibold tracking-[-0.01em] leading-snug',
              )}
            >
              {post.title}
            </h2>
            <p className={cn(t.label, 'mt-2 text-faint')}>
              {post.publishedAt} · ~{post.readMinutes} min read
            </p>
            {post.coverImage && (
              <img
                src={post.coverImage}
                alt=""
                className="mt-5 aspect-video w-full rounded-lg border border-line object-cover"
              />
            )}
            <p className={cn(t.body, 'mt-5 text-muted')}>{post.excerpt}</p>
            <div className="mt-6 flex justify-end">
              <Link href={`/journal/${post.slug}`}>
                <Button autoFocus onClick={onClose} data-testid="journal-peek-read">
                  Read the full post <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
