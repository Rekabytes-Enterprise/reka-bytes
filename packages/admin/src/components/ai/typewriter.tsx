'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Types out text character-by-character (terminal feel). Retypes when `text`
 * changes — used for the newest progress log line. The block cursor blinks
 * while `busy`; it disappears when idle/done.
 */
export function TypewriterLine({
  text,
  busy,
  className,
}: {
  text: string;
  busy?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCount(text.length);
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) timer = window.setTimeout(tick, 14);
    };
    let timer = window.setTimeout(tick, 14);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, count)}</span>
      {busy ? (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-accent"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        />
      ) : null}
    </span>
  );
}
