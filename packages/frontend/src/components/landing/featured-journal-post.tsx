'use client';

/**
 * Featured journal slot on the company home page (PRD-07 §3.4). Client-side
 * read via useApiQuery so `/` stays prerender-safe (no build-time backend
 * fetch — the v0.1.1 lesson). Hidden entirely when there is no featured post;
 * never a placeholder.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { typeStyles, type JournalPostSummary } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/hooks/api-query';
import { Button } from '@/components/ui/button';

export function FeaturedJournalPost() {
  const t = typeStyles;
  // 404-shaped null (no featured post) is a normal answer — don't toast it.
  const { data } = useApiQuery<JournalPostSummary | null>('/api/public/posts/featured', {
    toastError: false,
  });
  if (!data) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10">
      <div
        data-testid="home-featured-journal"
        className="grid grid-cols-1 items-center gap-10 border border-line bg-elevated p-10 lg:grid-cols-8 lg:p-12"
      >
        <div className="lg:col-span-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent">
            {'// from the journal'}
          </p>
          <h3 className={cn(t.displayM, 'mt-4')}>
            <Link href={`/journal/${data.slug}`} className="hover:text-accent">
              {data.title}
            </Link>
          </h3>
          <p className={cn(t.bodySm, 'mt-4 text-muted')}>{data.excerpt}</p>
          <p className={cn(t.label, 'mt-6 text-faint')}>
            {data.publishedAt} · ~{data.readMinutes} min read
          </p>
        </div>
        <div className="lg:col-span-3 lg:justify-self-end">
          <Link href={`/journal/${data.slug}`}>
            <Button variant="ghost">
              Read on the journal <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
          <p className={cn(t.label, 'mt-3 text-faint')}>
            all posts →{' '}
            <Link href="/journal" className="text-accent underline-offset-4 hover:underline">
              /journal
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
