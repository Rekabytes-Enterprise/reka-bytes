'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side redirect (NOT server `redirect()`): a server redirect re-fires
 * on browser-back navigation (popstate), which churns the client router and
 * can drop the console layout — the "sidebar disappeared" bug. A client
 * replace keeps history clean and the layout stable.
 */
export default function AIMasterclassIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ai-masterclass/step/1');
  }, [router]);
  return (
    <p className="font-mono text-xs uppercase tracking-[0.12em] text-faint">
      // opening AI masterclass…
    </p>
  );
}
