import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { NotFoundScene } from '@/components/landing/not-found-scene';

export const metadata: Metadata = {
  title: 'Block not found — Reka Bytes',
  description: 'This page isn’t part of the world yet. Head back to spawn.',
};

/**
 * Global 404 — renders for every unmatched route (including the footer's
 * planned-but-unbuilt /project, /news, /showcase) and for `notFound()` calls
 * bubbling up from nested routes.
 *
 * Minecraft-flavoured but brand-voiced: the voxel scene is the joke, the copy
 * stays dry. Fixed flavour coordinates (no Date/random) keep SSR deterministic.
 */
const CHUNK = { x: 404, y: 64, z: -101 } as const;

export default function NotFound() {
  const t = typeStyles;

  return (
    <main data-testid="error-404" className="flex min-h-dvh flex-col">
      {/* Scene band — paper grid shows through the transparent canvas */}
      <section className="relative h-[clamp(300px,46vh,520px)] overflow-hidden border-b border-line bg-inset">
        <div className="blueprint-grid absolute inset-0" aria-hidden />
        <NotFoundScene className="absolute inset-0 size-full" />
        <p
          aria-hidden
          className="pointer-events-none absolute bottom-4 left-6 font-mono text-[10px] uppercase tracking-[0.12em] text-faint"
        >
          fig.404 — chunk not loaded
        </p>
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-canvas/80 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted backdrop-blur-sm">
          click to wander · drag to orbit · scroll to zoom
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-20 lg:px-10 lg:py-24">
        <Breadcrumb items={[{ label: 'home', href: '/' }, { label: '404' }]} />
        <h1 className={cn(t.displayL, 'mt-8')}>Block not found.</h1>
        <p className={cn(t.mono, 'mt-6 text-muted')}>
          {'// chunk ('}
          {CHUNK.x}, {CHUNK.y}, {CHUNK.z}
          {') · this block was never placed'}
        </p>
        <p className={cn(t.body, 'mt-4 max-w-xl text-muted')}>
          The link may be off by one block, or this page hasn’t been generated yet. Either way, your
          spawn point is safe.
        </p>
        <Link href="/" data-testid="error-404-home" className="mt-10 inline-block">
          <Button>
            Return to spawn <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </Link>
      </section>

      <Footer />
    </main>
  );
}
