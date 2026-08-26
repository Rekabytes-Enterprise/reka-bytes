'use client';

import { useEffect, useState } from 'react';

/**
 * Live mm:ss (or h:mm:ss) elapsed timer — sets expectations on long
 * generation runs. Starts on mount; restarts if `since` (epoch ms) changes.
 */
export function ElapsedTimer({ since }: { since?: number }) {
  const [now, setNow] = useState(() => Date.now());
  const start = since ?? 0;

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - (start || now)) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <span className="font-mono text-xs text-faint" role="timer" aria-label="Elapsed time" data-testid="ai-elapsed">
      ⏱ {label}
    </span>
  );
}
