/**
 * Normalize a YouTube URL to an embed URL, or null if not YouTube.
 * Accepts: youtube.com/watch?v=ID · youtu.be/ID · youtube.com/embed/ID
 */
export function toYouTubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return `https://www.youtube.com${parsed.pathname}`;
      }
      return null;
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
