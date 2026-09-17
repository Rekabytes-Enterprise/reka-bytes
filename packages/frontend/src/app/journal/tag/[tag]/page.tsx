import type { Metadata } from 'next';
import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { JournalListView } from '@/components/journal/journal-list-view';
import { fetchJournalList } from '@/lib/journal-fetch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Journal · ${tag} — Reka Bytes` };
}

/**
 * Tag page (PRD-07 §5.2). The `[tag]` segment is static-checked only via the
 * API filter; an unknown tag renders the empty state, not a 404 — tags grow
 * out of frontmatter and shouldn't need route registration.
 */
export default async function JournalTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ tag: rawTag }, { page }] = await Promise.all([params, searchParams]);
  const tag = decodeURIComponent(rawTag).trim().toLowerCase();
  const list = await fetchJournalList({ tag, page });
  return (
    <main>
      <SiteNav variant="main" />
      <JournalListView list={list} tag={tag} />
      <Footer variant="main" />
    </main>
  );
}
