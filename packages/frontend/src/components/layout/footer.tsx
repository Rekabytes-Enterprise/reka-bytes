import Link from 'next/link';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { OPERATOR } from '@/lib/legal';

/**
 * Footer link columns.
 *
 * Adding a new link? Just add an entry to the right column — the layout is
 * data-driven so no JSX changes are required. Adding a new column? Push a new
 * `{title, links: [...]}` entry below; the grid (3 cols on desktop, 2 on
 * mobile) will adapt.
 *
 * NOTE: About / Project / News / Showcase are planned routes that do not exist
 * yet — they will 404 until the corresponding `app/(routes)/<slug>/page.tsx`
 * is created. Remove or relabel freely.
 */
const FOOTER_COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Project', href: '/project' },
      { label: 'News', href: '/news' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Showcase', href: '/showcase' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

/**
 * Global site footer.
 *
 * Rendered on every public page (landing, privacy, terms, cookies, login,
 * register). The country in the bottom bar comes from `LEG_OPERATOR_COUNTRY`
 * (default "Malaysia") — see `src/lib/legal.ts`.
 *
 * Pages with a long scroll should render it after `</main>`; pages with
 * short content (login/register) should wrap their main in a `flex
 * min-h-dvh flex-col` container so the footer stays anchored to the bottom.
 */
export function Footer() {
  const t = typeStyles;

  return (
    <footer className="border-t border-line bg-elevated">
      <div className="mx-auto max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
        {/* Top: brand + link columns */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-10">
          {/* Brand block */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-baseline font-mono text-lg font-bold tracking-[-0.02em]"
            >
              <span className="text-accent">reka</span>
              <span className="text-muted">·</span>
              <span className="text-ink">bytes</span>
            </Link>
            <p className="mt-6 max-w-sm font-body text-sm leading-relaxed text-muted">
              Teaching non-CS people to vibe code properly — fundamentals first, with
              an engineer who ships for a living.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:text-accent-hover"
            >
              Apply to cohort <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7"
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink">
                  {col.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="font-body text-sm text-muted transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-8 sm:flex-row sm:items-center">
          <p className={cn(t.label, 'text-faint')}>© {new Date().getFullYear()} reka bytes</p>
          <p className={cn(t.label, 'text-faint')}>
            made in {OPERATOR.country.toLowerCase()}
          </p>
        </div>
      </div>
    </footer>
  );
}
