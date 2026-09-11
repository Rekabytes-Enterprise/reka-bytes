'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface XpToast {
  id: number;
  amount: number;
  /** When true, confetti bursts alongside the toast. */
  celebrate?: boolean;
  /** Optional label (e.g. quiz passed, module done). */
  label?: string;
}

type Listener = (t: XpToast) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Imperatively show a floating XP toast (PRD-04 §6). */
export function showXpToast(
  amount: number,
  opts: { celebrate?: boolean; label?: string } = {},
): void {
  for (const fn of listeners) fn({ id: nextId++, amount, ...opts });
}

/** Burst confetti (PRD-04 §6). Honors prefers-reduced-motion. */
export async function fireConfetti(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confetti = (await import('canvas-confetti')).default;
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
    '#4e7700';
  const success =
    getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() ||
    '#15803d';
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.4 },
    // Light theme: third piece uses ink so it stays visible on paper
    // (white confetti against a paper-white canvas would disappear).
    colors: [accent, success, '#14161a'],
    ticks: 200,
  });
}

/**
 * Mounted ONCE at the student layout — drains the event bus into a stack
 * of auto-dismissing toasts. Keeps imperative callers decoupled from
 * portal/state plumbing.
 */
export function XpToastHost() {
  const [items, setItems] = useState<XpToast[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle !== undefined) window.clearTimeout(handle);
    timers.current.delete(id);
  }, []);

  useEffect(() => {
    const onToast: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      const handle = window.setTimeout(() => dismiss(t.id), 2400);
      timers.current.set(t.id, handle);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      for (const handle of timers.current.values()) window.clearTimeout(handle);
      timers.current.clear();
    };
  }, [dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      data-testid="xp-toast-host"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-accent/40 bg-elevated/95 px-4 py-2.5 shadow-lift backdrop-blur-sm"
            data-testid="xp-toast"
          >
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            <span className="font-display text-sm font-semibold text-accent">+{t.amount} xp</span>
            {t.label && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                {t.label}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
