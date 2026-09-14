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
 * NOTE: Project / News / Showcase are planned routes that do not exist yet —
 * they will 404 until the corresponding page is created. Remove or relabel
 * freely.
 */
const FOOTER_COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/academy/about' },
      { label: 'Project', href: '/project' },
      { label: 'News', href: '/news' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Academy', href: '/academy' },
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
 * Global site footer — compact sizing, used on EVERY public page (company
 * home, academy, about, legal pages, login, register, 404). Same structure as
 * the original full footer (brand + link columns + bottom bar) with tightened
 * paddings so it doesn't dominate short pages like /login.
 *
 * Two variants, matching SiteNav:
 * - 'main'    — company blurb + `start a project` mailto CTA.
 * - 'academy' — academy blurb + `apply to cohort → /register` CTA.
 *
 * The country in the bottom bar comes from `LEG_OPERATOR_COUNTRY` (default
 * "Malaysia") — see `src/lib/legal.ts`.
 *
 * Pages with a long scroll should render it after `</main>`; pages with
 * short content (login/register) should wrap their main in a `flex
 * min-h-dvh flex-col` container so the footer stays anchored to the bottom.
 */
export function Footer({ variant = 'main' }: { variant?: 'main' | 'academy' }) {
  const t = typeStyles;
  const isAcademy = variant === 'academy';

  return (
    <footer className="border-t border-line bg-elevated" data-testid="site-footer">
      <div className="mx-auto max-w-[1240px] px-6 py-10 lg:px-10">
        {/* Top: brand + link columns */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
          {/* Brand block */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-baseline font-mono text-base font-bold tracking-[-0.02em]"
            >
              <span className="text-accent">reka</span>
              <span className="text-muted">·</span>
              <span className="text-ink">bytes</span>
            </Link>
            {isAcademy ? (
              <>
                <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-muted">
                  Teaching non-CS people to vibe code properly — fundamentals first.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:text-accent-hover"
                >
                  Apply to cohort <span aria-hidden>→</span>
                </Link>
              </>
            ) : (
              <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-muted">
                We design and build mobile and web apps — fundamentals-first engineering with
                budgets that flex to your stage.
              </p>
            )}
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="font-body text-xs text-muted transition-colors hover:text-accent"
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
        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
          <p className={cn(t.label, 'text-faint')}>© {new Date().getFullYear()} reka bytes</p>
          <p className={cn(t.label, 'text-faint')}>made in {OPERATOR.country.toLowerCase()}</p>
        </div>
      </div>
    </footer>
  );
}
