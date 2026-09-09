import Link from 'next/link';

export type BreadcrumbItem = {
  /** Visible label, e.g. "home", "privacy". */
  label: string;
  /** Omit on the last (current) item to render it as plain text, not a link. */
  href?: string;
};

/**
 * Lowercase mono breadcrumb — used on legal pages in the format
 * `home / privacy` etc. The current (last) item is rendered as text; every
 * other item links back along the trail.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-[0.12em]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-ink" aria-current="page">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-faint">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
