'use client';

import type { StudentClassDTO } from '@reka-bytes/shared';
import { ClassPath } from '@/components/student/class-path';
import { useApiQuery } from '@/hooks/api-query';
import { Card } from '@/components/ui/card';

export default function LearnPage() {
  // Server state via useApiQuery (jotai atom); errors toast on failure.
  const { data: classes, loading } = useApiQuery<StudentClassDTO[]>('/api/learn/classes');

  if (loading || !classes) {
    return <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">// loading classes…</p>;
  }
  if (classes.length === 0) {
    return (
      <Card className="mt-10 border-dashed p-12 text-center">
        <h2 className="font-display text-2xl font-semibold">No classes published yet</h2>
        <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-muted">
          Your instructors are preparing the material. It will appear here automatically.
        </p>
      </Card>
    );
  }

  return (
    <div data-testid="learn-tree">
      <header>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-dim">classroom</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Learn</h1>
      </header>

      {classes.map((cls) => (
        <ClassPath key={cls.id} cls={cls} />
      ))}
    </div>
  );
}
