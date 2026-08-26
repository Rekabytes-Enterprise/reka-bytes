'use client';

import { useStudentGuard } from '@/hooks/use-student-guard';
import { StudentSidebar } from '@/components/student/sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const state = useStudentGuard();

  if (state === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading classroom…</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh md:pl-60">
      <StudentSidebar />
      <main className="mx-auto w-full max-w-[1100px] px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
