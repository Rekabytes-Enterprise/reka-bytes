'use client';

/**
 * Admin console sidebar (PRD-03 §3.1). Desktop: fixed rail. Mobile: top bar
 * + slide-down menu. Terminal Editorial: mono uppercase labels, accent rail
 * on the active item.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Layers,
  BookOpen,
  GraduationCap,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { apiFetch } from '@reka-bytes/shared';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Inbox },
  { href: '/cohorts', label: 'Cohorts', icon: Layers },
  { href: '/content', label: 'Content', icon: BookOpen },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/ai-masterclass', label: 'AI Masterclass', icon: GraduationCap },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
  };

  const links = (onNavigate?: () => void) =>
    NAV.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`flex items-center gap-3 border-l-2 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
          isActive(href)
            ? 'border-accent bg-elevated text-accent'
            : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
        }`}
      >
        <Icon size={15} aria-hidden />
        {label}
      </Link>
    ));

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-canvas px-4 py-3 md:hidden">
        <Link
          href="/"
          className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent"
        >
          reka·bytes / admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="border border-line p-2 text-muted"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
      {open && (
        <nav className="sticky top-[49px] z-40 flex flex-col border-b border-line bg-canvas py-2 md:hidden">
          {links(() => setOpen(false))}
        </nav>
      )}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-canvas md:flex">
        <div className="border-b border-line px-5 py-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
            reka·bytes
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            admin console
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 py-4">{links()}</nav>
        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-danger"
          >
            <LogOut size={15} aria-hidden />
            log out
          </button>
        </div>
      </aside>
    </>
  );
}
