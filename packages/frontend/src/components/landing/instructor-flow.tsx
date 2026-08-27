'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-media-query';

/**
 * Local light-theme palette for the instructor-flow canvas (2026-08).
 * Mirrors the frontend @theme tokens in globals.css; we don't import the
 * shared `colors` constant because admin also uses it (out of scope).
 */
const colors = {
  border: '#E3E5DE',
  borderStrong: '#C6CAC0',
  accent: '#4E7700',
  accentDim: '#558006',
  bgInset: '#F0F1EC',
  textPrimary: '#14161A',
  textSecondary: '#565E66',
};

type Pt = { x: number; y: number };

/** Normalized node positions — zigzag schematic layout. */
const NODES: Array<Pt & { label: string }> = [
  { x: 0.26, y: 0.14, label: '01 / PROMPT' },
  { x: 0.74, y: 0.38, label: '02 / READ' },
  { x: 0.26, y: 0.62, label: '03 / DEBUG' },
  { x: 0.74, y: 0.86, label: '04 / SHIP' },
];

/** Elbow (right-angle) connector between two nodes — blueprint style. */
function elbow(a: Pt, b: Pt): Pt[] {
  const midY = (a.y + b.y) / 2;
  return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b];
}

/** Return path: SHIP → left rail → back up to PROMPT (the iteration loop). */
function loopback(first: Pt, last: Pt): Pt[] {
  return [last, { x: 0.08, y: last.y }, { x: 0.08, y: first.y }, first];
}

function pointAt(path: Pt[], t: number, w: number, h: number): Pt {
  const pts = path.map((p) => ({ x: p.x * w, y: p.y * h }));
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    lens.push(l);
    total += l;
  }
  let dist = t * total;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (dist <= l || i === lens.length - 1) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const k = l === 0 ? 0 : Math.min(1, dist / l);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    dist -= l;
  }
  return pts[pts.length - 1]!;
}

/**
 * InstructorFlow — animated schematic of the loop we teach.
 * Particles travel PROMPT → READ → DEBUG → SHIP and cycle back through the
 * dashed return rail. Nodes pulse as particles pass. Static frame when
 * reduced motion is preferred. Decorative — aria-hidden.
 */
export function InstructorFlow({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paths = [
      elbow(NODES[0]!, NODES[1]!),
      elbow(NODES[1]!, NODES[2]!),
      elbow(NODES[2]!, NODES[3]!),
      loopback(NODES[0]!, NODES[3]!),
    ];

    const particles = [
      { path: 0, t: 0.05, speed: 0.11 },
      { path: 1, t: 0.4, speed: 0.11 },
      { path: 2, t: 0.75, speed: 0.11 },
      { path: 3, t: 0.3, speed: 0.07 }, // slower on the return rail
    ];

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function strokePath(path: Pt[], dashed: boolean) {
      ctx!.beginPath();
      path.forEach((p, i) => {
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      });
      ctx!.setLineDash(dashed ? [4, 6] : []);
      ctx!.strokeStyle = dashed ? colors.border : colors.borderStrong;
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.setLineDash([]);
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);

      // connectors (last = return rail, dashed)
      paths.forEach((p, i) => strokePath(p, i === paths.length - 1));

      // particles + trails
      const positions: Pt[] = [];
      for (const pt of particles) {
        for (let g = 0; g < 4; g++) {
          const gt = pt.t - g * 0.018;
          if (gt < 0) continue;
          const pos = pointAt(paths[pt.path]!, gt, w, h);
          const size = g === 0 ? 5 : 3;
          ctx!.fillStyle = colors.accent;
          ctx!.globalAlpha = g === 0 ? 1 : 0.45 - g * 0.12;
          ctx!.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
          ctx!.globalAlpha = 1;
        }
        positions.push(pointAt(paths[pt.path]!, pt.t, w, h));
      }

      // nodes + labels + proximity pulse
      ctx!.font = '700 10px "JetBrains Mono", monospace';
      NODES.forEach((node, i) => {
        const x = node.x * w;
        const y = node.y * h;

        const near = positions.some((p) => Math.hypot(p.x - x, p.y - y) < 26);
        if (near) {
          const pulse = 8 + 4 * Math.sin(now / 180 + i);
          ctx!.strokeStyle = colors.accent;
          ctx!.globalAlpha = 0.5;
          ctx!.strokeRect(x - pulse / 2, y - pulse / 2, pulse, pulse);
          ctx!.globalAlpha = 1;
        }

        ctx!.strokeStyle = near ? colors.accent : colors.accentDim;
        ctx!.lineWidth = 1;
        ctx!.strokeRect(x - 5, y - 5, 10, 10);
        ctx!.fillStyle = near ? colors.accent : colors.bgInset;
        ctx!.fillRect(x - 2.5, y - 2.5, 5, 5);

        ctx!.fillStyle = near ? colors.textPrimary : colors.textSecondary;
        if (node.x < 0.5) {
          ctx!.textAlign = 'left';
          ctx!.fillText(node.label, x + 14, y + 3);
        } else {
          ctx!.textAlign = 'right';
          ctx!.fillText(node.label, x - 14, y + 3);
        }
      });
    }

    if (reducedMotion) {
      // one static frame
      draw(0);
      return () => ro.disconnect();
    }

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(canvas);

    let raf = 0;
    let running = true;
    let last = performance.now();
    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const pt of particles) {
        pt.t += dt * pt.speed;
        if (pt.t > 1) {
          pt.t -= 1;
          pt.path = (pt.path + 1) % paths.length;
        }
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
