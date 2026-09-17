import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { JournalMarkdown } from '@/components/journal/journal-markdown';
import { fetchJournalPost } from '@/lib/journal-fetch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) return { title: 'Post not found — Reka Bytes' };
  return { title: `${post.title} — Reka Bytes`, description: post.excerpt };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = typeStyles;
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) notFound();

  return (
    <main>
      <SiteNav variant="main" />
      <article className="mx-auto max-w-[72ch] px-6 py-28 lg:py-36">
        <p>
          <Link
            data-testid="journal-back-link"
            href="/journal"
            className={cn(t.label, 'inline-flex items-center gap-2 text-faint hover:text-accent')}
          >
            <ArrowLeft className="size-3" aria-hidden /> journal
          </Link>
        </p>
        <header className="mt-8">
          <h1 data-testid="journal-title" className={cn(t.displayM)}>
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <time
              data-testid="journal-published-at"
              dateTime={post.publishedAt}
              className={cn(t.label, 'text-faint')}
            >
              {post.publishedAt}
            </time>
            <span data-testid="journal-read-time" className={cn(t.label, 'text-faint')}>
              ~{post.readMinutes} min read
            </span>
            <span data-testid="journal-tags" className="flex gap-3">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  data-testid={`journal-tag-${tag}`}
                  href={`/journal/tag/${tag}`}
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent-dim hover:text-accent"
                >
                  #{tag}
                </Link>
              ))}
            </span>
          </div>
        </header>
        <div className="mt-12">
          <JournalMarkdown widgetHtml={post.widgetHtml}>{post.body}</JournalMarkdown>
        </div>
        <footer className="mt-16 border-t border-line pt-8">
          <p className={cn(t.bodySm, 'text-muted')}>
            Written by the founder of Reka Bytes. Want the same fundamentals behind your product?{' '}
            <Link href="/#start" className="text-accent underline-offset-4 hover:underline">
              Start a project
            </Link>{' '}
            — or{' '}
            <Link href="/academy" className="text-accent underline-offset-4 hover:underline">
              learn to build it yourself
            </Link>
            .
          </p>
        </footer>
      </article>
      <Footer variant="main" />
    </main>
  );
}
