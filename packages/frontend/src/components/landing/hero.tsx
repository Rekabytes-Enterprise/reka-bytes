'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTypography } from '@/hooks/use-typography';
import { cn } from '@/lib/utils';
import { ByteStream } from './byte-stream';
import { SeatsMeter } from './seats-meter';
import { Button } from '@/components/ui/button';

/** Hero — asymmetric 8/4 split: headline left, WebGL byte-stream right. */
export function Hero() {
  const { t } = useTypography();

  const reveal = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="blueprint-grid relative min-h-dvh overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-16 px-6 py-24 lg:min-h-dvh lg:grid-cols-8 lg:gap-20 lg:px-10">
        {/* Left — text */}
        <motion.div
          className="lg:col-span-5"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.06 }}
        >
          <motion.div {...reveal} transition={{ duration: 0.4, ease: 'easeOut' }}>
            <SeatsMeter variant="chip" />
          </motion.div>

          <motion.h1
            {...reveal}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
            className={cn(t.displayXL, 'mt-8')}
          >
            Learn to vibe code{' '}
            <span className="relative inline-block text-accent">
              properly.
              <span className="absolute -bottom-1 left-0 h-px w-full bg-accent" aria-hidden />
            </span>
          </motion.h1>

          <motion.p
            {...reveal}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            className={cn(t.body, 'mt-8 max-w-xl text-muted')}
          >
            AI can write your code. We teach you what it actually wrote. Reka Bytes pairs hands-on
            vibe coding with the software engineering fundamentals most vibe coders skip —
            architecture, debugging, git, and APIs.
          </motion.p>

          <motion.div
            {...reveal}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
            className="mt-12 flex flex-wrap items-center gap-5"
          >
            <Link href="/register">
              <Button>
                Register for Cohort 001 <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <a href="#curriculum">
              <Button variant="ghost">See the curriculum</Button>
            </a>
          </motion.div>

          <motion.p
            {...reveal}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
            className={cn(t.label, 'mt-16 text-faint')}
          >
            {'// taught by a software engineer · google certified project manager'}
          </motion.p>
        </motion.div>

        {/* Right — byte stream visual */}
        <motion.div
          className="relative h-[26rem] border border-line lg:col-span-3 lg:h-[40rem]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <ByteStream className="absolute inset-0 size-full" />
          {/* corner ticks */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
            <span
              key={pos}
              className={`absolute ${pos} font-mono text-sm leading-none text-faint`}
              aria-hidden
            >
              +
            </span>
          ))}
          <p
            className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.12em] text-faint"
            aria-hidden
          >
            fig.01 — byte stream / live
          </p>
        </motion.div>
      </div>
    </section>
  );
}
