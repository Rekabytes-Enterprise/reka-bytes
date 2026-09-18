'use client';

/**
 * Self-hosted 3D desk model for the journal section, rendered with
 * @google/model-viewer (the lightest way to ship a glb — orbit controls,
 * mobile handling, and PBR rendering without writing three.js code).
 *
 * The web-component script is dynamically imported on mount so its bundle
 * never lands in the main chunk, and the element only renders once it is
 * registered (no unstyled-custom-element flash). Auto-rotate is the idle
 * motion; it is gated behind reduced-motion, and interaction pauses it.
 *
 * House rules honored: no `as any` (see types/model-viewer.d.ts), lazy
 * loading only, and the desk never hijacks vertical page scroll
 * (touch-action pan-y + disable-zoom).
 */
import { useEffect, useState } from 'react';
import { typeStyles } from '@reka-bytes/shared';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-media-query';

export function JournalDeskModel({ className }: { className?: string }) {
  const t = typeStyles;
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void import('@google/model-viewer').then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={cn('relative h-full w-full', className)}>
      {ready ? (
        <model-viewer
          src="/assets/3D/Table-Laptop.glb"
          alt="A wooden floating desk with an open laptop, a mug of coffee on a coaster, and a spiral notebook with an olive fountain pen."
          camera-controls
          disable-zoom
          camera-orbit="38deg 70deg auto"
          touch-action="pan-y"
          auto-rotate={!reducedMotion}
          rotation-per-second="14"
          interaction-prompt="none"
          shadow-intensity={0.5}
          shadow-softness={0.8}
          exposure={0.95}
          loading="lazy"
          className="h-full w-full"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center border border-line bg-inset"
          role="status"
        >
          <p className={cn(t.label, 'animate-pulse text-faint')}>{'// the desk is arriving…'}</p>
        </div>
      )}
    </div>
  );
}
