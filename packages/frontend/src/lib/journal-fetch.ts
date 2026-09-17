import type { JournalListDTO, JournalPostDetail } from '@reka-bytes/shared';
import { getBackendUrl } from './backend-url';

/**
 * Server-side journal reads for the SSR pages under /journal.
 *
 * Same runtime-`getBackendUrl()` mechanism as the /api proxy route handler
 * (never NEXT_PUBLIC_*, never build-time). Pages are force-dynamic, so these
 * fetch at request time in dev and prod — the frontend build never contacts
 * the backend.
 *
 * 404 from the API maps to `null` so the page can call notFound() and render
 * the branded 404; any other failure throws and hits the error boundary.
 */

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${getBackendUrl()}${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`journal fetch failed (${res.status}): ${path}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export function fetchJournalList(params: { page?: string; tag?: string }): Promise<JournalListDTO> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.tag) query.set('tag', params.tag);
  const qs = query.size > 0 ? `?${query.toString()}` : '';
  return fetchJson<JournalListDTO>(`/api/public/posts${qs}`).then(
    (data) => data ?? { posts: [], page: 1, limit: 10, total: 0, totalPages: 1 },
  );
}

export function fetchJournalPost(slug: string): Promise<JournalPostDetail | null> {
  return fetchJson<JournalPostDetail>(`/api/public/posts/${encodeURIComponent(slug)}`);
}
