'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, BookOpen, User, ChevronRight, Menu, X } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { type LearnDashboardDTO } from '@reka-bytes/shared';
import { sessionAtom } from '@/atoms/auth';
import { useApiQuery } from '@/hooks/api-query';
import { LevelRing } from '@/components/student/game/level-ring';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/learn', label: 'Learn', Icon: BookOpen },
  { href: '/profile', label: 'Profile', Icon: User },
] as const;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5 px-3" data-testid="student-sidebar">
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-full px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
              active ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const user = useAtomValue(sessionAtom);

  // Lightweight level ring feed — dashboard DTO is cheap at cohort scale;
  // mount unconditionally so the ring animates as soon as data lands.
  const { data } = useApiQuery<LearnDashboardDTO>('/api/learn/dashboard');

  if (!user) return null;

  return (
    <div className="border-t border-line p-4">
      {/* One proper profile button: avatar (XP ring) + name. Email and log
          out live on /profile — this row is just the entry point. */}
      <Link
        href="/profile"
        data-testid="sidebar-profile-button"
        aria-label={`Open profile — ${user.name}`}
        className="group flex w-full items-center gap-3 rounded-panel border border-line bg-elevated p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
      >
        {data ? (
          <LevelRing
            level={data.game.xp.level}
            intoLevel={data.game.xp.intoLevel}
            forNextLevel={data.game.xp.forNextLevel}
            initials={initialsOf(user.name)}
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent ring-1 ring-accent/30">
            {initialsOf(user.name)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-body text-sm font-semibold text-ink">
            {user.name}
          </span>
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-faint transition-colors group-hover:text-accent">
            view profile
          </span>
        </span>
        <ChevronRight
          size={16}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </Link>
    </div>
  );
}

export function StudentSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-canvas px-4 py-3 md:hidden">
        <span className="font-display text-lg font-semibold">reka·bytes</span>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="text-muted hover:text-ink"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Desktop sidebar — floating rounded rail (PRD-04 §2.4). */}
      <aside className="card-surface fixed bottom-4 left-4 top-4 z-30 hidden w-60 flex-col justify-between overflow-hidden md:flex">
        <div>
          <Link
            href="/dashboard"
            className="block px-6 pb-6 pt-7 font-display text-xl font-semibold tracking-tight"
          >
            reka<span className="text-accent">·</span>bytes
          </Link>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-line bg-canvas/95 backdrop-blur-md md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              <div>
                <div className="flex items-center justify-between px-5 pb-6 pt-6">
                  <span className="font-display text-xl font-semibold">
                    reka<span className="text-accent">·</span>bytes
                  </span>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="text-muted hover:text-ink"
                  >
                    <X size={20} />
                  </button>
                </div>
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <SidebarFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
