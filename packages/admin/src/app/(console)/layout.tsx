import type { ReactNode } from 'react';
import { ConsoleSidebar } from '@/components/admin/console-sidebar';

/**
 * Console shell (PRD-03 §3.1): sidebar + content area for every admin page
 * except /login (which lives outside this route group).
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <ConsoleSidebar />
      <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </div>
    </div>
  );
}
