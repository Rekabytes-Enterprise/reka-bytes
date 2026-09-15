import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Floating site navbar — a detached paper pill fixed above the page content
 * (Soft Terminal: canvas/85 + backdrop blur + shadow-lift elevation).
 *
 * Two variants, one component:
 * - 'main'    — company pages (/, /privacy, /terms, /cookies): brand +
 *               `academy →` CTA. NO Log in — auth lives on the academy side.
 * - 'academy' — academy pages (/academy, /academy/about): brand + curriculum /
 *               about links + Log in CTA (the only route to /login from the
 *               marketing side).
 *
 * Auth surfaces (login/register) and the 404 scene stay chrome-free on
 * purpose. The student app has its own sidebar.
 *
 * The Log in button is intentionally static (no session check): logged-in
 * students hitting /login again is a harmless, rare flow, and a static
 * server component keeps the nav SSR-simple. Revisit if analytics say
 * otherwise.
 */

const ACADEMY_LINKS = [
  { label: 'curriculum', href: '/academy#curriculum' },
  { label: 'about', href: '/academy/about' },
] as const;

export function SiteNav({ variant = 'main' }: { variant?: 'main' | 'academy' }) {
  const isAcademy = variant === 'academy';

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-5 sm:px-6">
      <nav
        aria-label="Site"
        data-testid="site-nav"
        className="flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 rounded-full border border-line bg-canvas/85 pl-6 pr-2 shadow-[var(--shadow-lift)] backdrop-blur-md"
      >
        {/* Brand — matches the footer's wordmark exactly */}
        <Link
          href="/"
          data-testid="nav-brand"
          className="inline-flex items-baseline font-mono text-lg font-bold tracking-[-0.02em]"
        >
          <span className="text-accent">reka</span>
          <span className="text-muted">·</span>
          <span className="text-ink">bytes</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          {/* Links — hidden below sm; the footer's nav covers mobile */}
          {isAcademy && (
            <div className="hidden items-center gap-6 sm:flex">
              {ACADEMY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={`nav-link-${link.label}`}
                  className={cn(
                    'font-mono text-xs font-bold uppercase tracking-[0.12em]',
                    'text-muted transition-colors hover:text-accent',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {isAcademy ? (
            // Login CTA — academy side only
            <Link href="/login" data-testid="nav-login">
              <Button className="px-5 py-2.5">Log in</Button>
            </Link>
          ) : (
            // Academy CTA — company side only
            <Link href="/academy" data-testid="nav-academy">
              <Button className="px-5 py-2.5">
                Academy <span aria-hidden>→</span>
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
