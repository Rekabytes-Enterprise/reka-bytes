import Link from 'next/link';

/** Branded 404 — unmatched admin routes render this instead of the bare default. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent-dim">reka·bytes / admin</p>
      <h1 className="font-display text-5xl font-semibold">404</h1>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// this page does not exist</p>
      <Link
        href="/"
        className="border border-line-strong px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
      >
        ← back to dashboard
      </Link>
    </main>
  );
}
