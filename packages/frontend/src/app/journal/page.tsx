import { Footer } from '@/components/layout/footer';
import { SiteNav } from '@/components/layout/site-nav';
import { JournalListView } from '@/components/journal/journal-list-view';
import { fetchJournalList } from '@/lib/journal-fetch';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Journal — Reka Bytes',
  description:
    'Build-in-public notes from the Reka Bytes studio — what we ship, what it costs, and what we learn doing it.',
};

export default async function JournalListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const list = await fetchJournalList({ page });
  return (
    <main>
      <SiteNav variant="main" />
      <JournalListView list={list} />
      <Footer variant="main" />
    </main>
  );
}
