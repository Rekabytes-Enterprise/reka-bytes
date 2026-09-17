import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { typeStyles, type JournalListDTO, type JournalPostSummary } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/landing/section-header';

/**
 * Journal list rendering shared by `/journal` and `/journal/tag/[tag]`
 * (PRD-07 §5.2). Server-rendered; pagination is real navigation (`?page=`).
 */

function Card({ post, featured }: { post: JournalPostSummary; featured: boolean }) {
  const t = typeStyles;
  return (
    <li
      data-testid={featured ? 'journal-featured-card' : `journal-card-${post.slug}`}
      className={cn(
        'group flex flex-col border bg-elevated p-8 transition-colors hover:border-line-strong',
        featured ? 'border-line-strong shadow-[var(--shadow-lift)]' : 'border-line',
      )}
    >
      {post.coverImage && (
        // Journal assets are runtime URLs on the API origin — not optimizable
        // by next/image (its loader can't see across origins at build time).
        <img
          data-testid={`journal-card-cover-${post.slug}`}
          src={post.coverImage}
          alt=""
          className="mb-6 aspect-video w-full rounded-lg border border-line object-cover"
        />
      )}
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-faint">
        {post.publishedAt}
        {featured ? ' · featured' : ''}
      </p>
      <h3 className={cn(t.headingS, 'mt-3')}>
        <Link href={`/journal/${post.slug}`} className="hover:text-accent">
          {post.title}
        </Link>
      </h3>
      <p className={cn(t.bodySm, 'mt-3 flex-1 text-muted')}>{post.excerpt}</p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span data-testid="journal-read-time" className={cn(t.label, 'text-faint')}>
          ~{post.readMinutes} min
        </span>
        <span className="flex flex-wrap gap-2">
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
    </li>
  );
}

export function JournalListView({ list, tag }: { list: JournalListDTO; tag?: string }) {
  const t = typeStyles;
  const { posts, page, totalPages, total } = list;
  const href = (n: number) => `/journal?page=${n}${tag ? `&tag=${tag}` : ''}`;

  return (
    <section className="mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-36">
      <SectionHeader
        name={tag ? `JOURNAL · ${tag}` : 'JOURNAL'}
        title={
          tag
            ? `Everything we've written about ${tag}.`
            : 'The studio log — shipping, deciding, and the bill for both.'
        }
      />
      <p className={cn(t.body, 'mt-8 max-w-2xl text-muted')}>
        Build-in-public notes from Reka Bytes. Every post is written by the founder, reviewed the
        way our code is — by commit.
      </p>

      {total === 0 ? (
        <p className={cn(t.body, 'mt-14 text-faint')}>
          // no posts {tag ? `tagged “${tag}” ` : ''}yet — check back soon.
        </p>
      ) : (
        <>
          <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.slug} post={post} featured={post.featured} />
            ))}
          </ul>
          {totalPages > 1 && (
            <nav
              aria-label="Journal pagination"
              className="mt-14 flex items-center justify-center gap-3"
            >
              {page > 1 && (
                <Link
                  data-testid="journal-prev-page"
                  href={href(page - 1)}
                  className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted hover:text-accent"
                >
                  ← newer
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  data-testid={`journal-page-${n}`}
                  href={href(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={cn(
                    'font-mono text-xs font-bold',
                    n === page ? 'text-accent' : 'text-faint hover:text-ink',
                  )}
                >
                  {n}
                </Link>
              ))}
              {page < totalPages && (
                <Link
                  data-testid="journal-next-page"
                  href={href(page + 1)}
                  className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted hover:text-accent"
                >
                  older →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
      <p className="mt-14">
        <Link href="/#start" className={cn(t.label, 'inline-flex items-center gap-1 text-accent')}>
          Have an idea? Start a project <ArrowRight className="size-3" aria-hidden />
        </Link>
      </p>
    </section>
  );
}
