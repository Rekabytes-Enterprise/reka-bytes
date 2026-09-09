'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/**
 * Interactive isometric voxel scene for the 404 — a Minecraft-style garden
 * chunk with one block missing: orbit the island by dragging, zoom with the
 * wheel, and click a tile to make the ghost block hop there in a burst of
 * petals. Cursor movement becomes wind that pushes the falling petals.
 *
 * Zero dependencies: canvas 2D, dimetric projection, azimuth-orbit camera.
 * (The reference site — petalwind — uses three.js; a rotated-projection
 * canvas covers our needs at a fraction of the weight.)
 *
 * Local light-theme palette literal — same rule as instructor-flow.tsx: we do
 * not import the shared `colors` constant because admin also uses it.
 *
 * Determinism: everything except hop/burst dynamics is index math, no
 * Math.random — SSR, screenshots and videos stay reproducible.
 *
 * Performance: terrain (~205 blocks) re-renders into an offscreen canvas only
 * when the camera moves or resizes; idle frames blit that cache and draw the
 * ~40 dynamic paths (water, ghost cube, petals, bursts). Depth sort runs per
 * camera change from rotated coordinates.
 */

// — dimetric projection constants (screen px at scale 1) —
const TW = 32;
const TH = 16;
const TZ = 16;

/** Island centre — the camera orbits around this point. */
const CENTRE = { x: 5.5, z: 5.5 };
const POOL: Array<[number, number]> = [
  [5, 5],
  [6, 5],
  [5, 6],
  [6, 6],
];
const WATER_Y = 0.7; // surface sits visibly below the rim (y=1)
const RING: Array<[number, number]> = [
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [4, 5],
  [7, 5],
  [4, 6],
  [7, 6],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
];
const CANOPY = [
  { x: 2, z: 2 },
  { x: 8, z: 6 },
];
const CANOPY_LOW: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const CANOPY_HIGH: Array<[number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

interface Palette {
  top: string;
  right: string;
  left: string;
}

interface Block {
  x: number;
  y: number;
  z: number;
  s: number;
  pal: Palette;
  /** Flat blocks draw only their top face at `y` (water surface). */
  flat?: boolean;
}

const PAL = {
  grass: { top: '#82A83C', right: '#8A5F38', left: '#6F4B2C' },
  grassLight: { top: '#93BC46', right: '#8A5F38', left: '#6F4B2C' },
  stone: { top: '#C6CAC0', right: '#9AA1A9', left: '#83898F' },
  stoneWhite: { top: '#EDEEE8', right: '#C6CAC0', left: '#AEB3AC' },
  water: { top: '#4E8FCB', right: '#4E8FCB', left: '#4E8FCB' },
  trunk: { top: '#8B5E3C', right: '#6E4A2E', left: '#573A24' },
  bloomA: { top: '#F9D2DF', right: '#F4B8CE', left: '#EBA0BC' },
  bloomB: { top: '#F9D2DF', right: '#EBA0BC', left: '#DE8FAD' },
  ghost: '#4E7700',
  shadow: 'rgba(20, 22, 26, 0.10)',
  inkLine: 'rgba(20, 22, 26, 0.07)',
} satisfies Record<string, Palette | string>;

const PETAL_COLORS = ['#F4B8CE', '#F9D2DF', '#EBA0BC'] as const;
const FLOWER_COLORS = ['#F4B8CE', '#FDF6F0', '#D7C4E8'] as const;

function buildBlocks(): Block[] {
  const blocks: Block[] = [];

  // Grass platform 11×11 minus the fountain pool, with sunlit variance.
  for (let x = 0; x <= 10; x++) {
    for (let z = 0; z <= 10; z++) {
      if (POOL.some(([px, pz]) => px === x && pz === z)) continue;
      const light = (x * 31 + z * 17) % 11 === 0;
      blocks.push({ x, y: 0, z, s: 1, pal: light ? PAL.grassLight : PAL.grass });
    }
  }

  // Stone rim around the pool.
  for (const [x, z] of RING) {
    blocks.push({ x, y: 0, z, s: 1, pal: PAL.stone });
  }

  // Water surface inside the ring (flat — the rim hides its sides).
  for (const [x, z] of POOL) {
    blocks.push({ x, y: WATER_Y, z, s: 1, flat: true, pal: PAL.water });
  }

  // Sakura trees: 3-block trunk + two canopy layers.
  for (const c of CANOPY) {
    for (let ty = 0; ty <= 2; ty++) {
      blocks.push({ x: c.x, y: ty, z: c.z, s: 1, pal: PAL.trunk });
    }
    let i = 0;
    for (const [dx, dz] of CANOPY_LOW) {
      blocks.push({
        x: c.x + dx,
        y: 3,
        z: c.z + dz,
        s: 1,
        pal: i % 2 === 0 ? PAL.bloomA : PAL.bloomB,
      });
      i++;
    }
    for (const [dx, dz] of CANOPY_HIGH) {
      blocks.push({
        x: c.x + dx,
        y: 4,
        z: c.z + dz,
        s: 1,
        pal: i % 2 === 0 ? PAL.bloomA : PAL.bloomB,
      });
      i++;
    }
  }

  // Stone arch across the back edge (pillars + lintel) — reference ruins.
  for (const px of [3, 7]) {
    for (let py = 0; py <= 2; py++) {
      blocks.push({ x: px, y: py, z: 0, s: 1, pal: PAL.stoneWhite });
    }
  }
  for (let lx = 3; lx <= 7; lx++) {
    blocks.push({ x: lx, y: 3, z: 0, s: 1, pal: PAL.stoneWhite });
  }

  // Benches — raised stone slabs facing the plaza.
  for (const [bx, bz] of [
    [3, 8],
    [4, 8],
    [8, 3],
    [9, 3],
  ] as Array<[number, number]>) {
    blocks.push({ x: bx, y: 1, z: bz, s: 1, pal: PAL.stone });
  }

  // Floating islet drifting beside the island — sky and depth.
  for (let ix = 13; ix <= 15; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      blocks.push({ x: ix, y: 1.4, z: iz, s: 1, pal: PAL.grass });
      blocks.push({ x: ix, y: 0.4, z: iz, s: 1, pal: { ...PAL.grass, top: '#8A5F38' } });
    }
  }
  blocks.push({ x: 14, y: 3.4, z: 0, s: 1, pal: PAL.trunk });
  let fi = 0;
  for (const [dx, dz] of CANOPY_HIGH) {
    blocks.push({
      x: 14 + dx,
      y: 4.4,
      z: dz,
      s: 1,
      pal: fi % 2 === 0 ? PAL.bloomA : PAL.bloomB,
    });
    fi++;
  }

  return blocks;
}

const BLOCKS: Block[] = buildBlocks();

/**
 * Occupancy map for face culling. A block's side face is only drawn when the
 * neighbouring cell in that direction is empty — without this, orbiting to a
 * diagonal makes interior side faces poke over their neighbour's top face and
 * the flat platform turns into a brown "waffle". Keyed by rounded cell coords
 * (water sits at y=0.7 → rounds to 1, so it never masks a rim block's y=0
 * neighbour, which is what we want: the rim's inner wall stays visible).
 */
const OCCUPIED: Set<string> = new Set(
  BLOCKS.filter((b) => !b.flat).map(
    (b) => `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.z)}`,
  ),
);

const isSolid = (x: number, y: number, z: number): boolean =>
  OCCUPIED.has(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`);

/** Flowers sprinkled deterministically on grass tops. */
const FLOWERS: Array<{ x: number; z: number; c: string }> = (() => {
  const flowers: Array<{ x: number; z: number; c: string }> = [];
  for (let x = 0; x <= 10; x++) {
    for (let z = 0; z <= 10; z++) {
      if (POOL.some(([px, pz]) => px === x && pz === z)) continue;
      if ((x * 31 + z * 17) % 4 !== 0) continue;
      flowers.push({
        x: x + 0.3 + ((x * 13) % 7) / 14,
        z: z + 0.3 + ((z * 11) % 7) / 14,
        c: FLOWER_COLORS[(x + z) % 3] ?? FLOWER_COLORS[0],
      });
    }
  }
  return flowers;
})();

interface Petal {
  tx: number;
  tz: number;
  ox: number;
  oz: number;
  y: number;
  speed: number;
  swayPhase: number;
  swayAmp: number;
  size: number;
  color: string;
}

function buildPetals(): Petal[] {
  const petals: Petal[] = [];
  for (let i = 0; i < 28; i++) {
    const tree = CANOPY[i % 2];
    if (!tree) continue;
    const r = ((i * 137) % 100) / 100;
    petals.push({
      tx: tree.x,
      tz: tree.z,
      ox: (r - 0.5) * 3.6,
      oz: (((i * 61) % 100) / 100 - 0.5) * 3.6,
      y: 4.4 + ((i * 29) % 100) / 100 * 2,
      speed: 0.5 + ((i * 43) % 100) / 100 * 0.45,
      swayPhase: (i * 2.399) % (Math.PI * 2),
      swayAmp: 0.25 + ((i * 71) % 100) / 100 * 0.4,
      size: 4 + ((i * 17) % 100) / 100 * 2.5,
      color: PETAL_COLORS[i % 3] ?? PETAL_COLORS[0],
    });
  }
  return petals;
}

const PETALS: Petal[] = buildPetals();

interface Burst {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/** Where the ghost block rests between wanders — the fountain centre. */
const HOP_HOME = { x: 5.5, z: 5.5 };

export function NotFoundScene({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maybeCtx = el.getContext('2d');
    if (!maybeCtx) return;
    const maybeStatic = document.createElement('canvas').getContext('2d');
    if (!maybeStatic) return;
    // NOTE: every helper below is a const arrow, not a hoisted `function` —
    // hoisted declarations lose TS's null-narrowing of ctx/sctx/el above
    // (TS18047). Do not "tidy" them back into function declarations.
    const ctx = maybeCtx;
    const sctx = maybeStatic;
    const staticCanvas = maybeStatic.canvas;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // — camera state (plain lets; React state would re-render per frame) —
    let az = -0.55;
    let azTarget = az;
    let zoom = 1;
    let zoomTarget = 1;
    const ZOOM_MIN = 0.6;
    const ZOOM_MAX = 2.1;
    const AZ_SPIN = 0.0075; // radians per dragged px

    let w = 0;
    let h = 0;
    let scale = 1;
    let ox = 0;
    let oy = 0;

    // — wander + wind state —
    let hops = 0;
    let hop: { fx: number; fz: number; tx: number; tz: number; t0: number; dur: number } | null =
      null;
    const bursts: Burst[] = [];
    let windX = 0;

    const project = (x: number, y: number, z: number): [number, number] => {
      const dx = x - CENTRE.x;
      const dz = z - CENTRE.z;
      const rx = dx * Math.cos(az) - dz * Math.sin(az);
      const rz = dx * Math.sin(az) + dz * Math.cos(az);
      return [
        (rx - rz) * (TW / 2) * scale + ox,
        (rx + rz) * (TH / 2) * scale - y * TZ * scale + oy,
      ];
    };

    /**
     * Depth toward the viewer after rotation = rx + rz (ascending = far first).
     * Both rotated components matter — sorting on rz alone mis-orders blocks
     * that share a row.
     */
    const depth = (x: number, z: number): number => {
      const dx = x - CENTRE.x;
      const dz = z - CENTRE.z;
      return dx * (Math.cos(az) + Math.sin(az)) + dz * (Math.cos(az) - Math.sin(az));
    };

    /** Is a world-space side normal facing the camera at the current azimuth? */
    const facingCamera = (nx: number, nz: number): boolean => {
      const rx = nx * Math.cos(az) - nz * Math.sin(az);
      const rz = nx * Math.sin(az) + nz * Math.cos(az);
      return rx + rz > 0;
    };

    const pathPoly = (
      c: CanvasRenderingContext2D,
      pts: Array<[number, number]>,
    ): void => {
      c.beginPath();
      let first = true;
      for (const [px, py] of pts) {
        if (first) {
          c.moveTo(px, py);
          first = false;
        } else {
          c.lineTo(px, py);
        }
      }
      c.closePath();
    };

    const drawBlockOn = (c: CanvasRenderingContext2D, b: Block): void => {
      const { x, y, z, s, pal } = b;
      const yTop = b.flat ? y : y + s;

      const top: Array<[number, number]> = [
        project(x, yTop, z),
        project(x + s, yTop, z),
        project(x + s, yTop, z + s),
        project(x, yTop, z + s),
      ];
      pathPoly(c, top);
      c.fillStyle = pal.top;
      c.fill();

      if (b.flat) return;

      // Four candidate side faces. Draw one only when it faces the camera AND
      // nothing solid occupies the neighbouring cell (face culling).
      const sides: Array<{
        n: [number, number];
        fill: string;
        pts: Array<[number, number]>;
      }> = [
        {
          n: [1, 0],
          fill: pal.right,
          pts: [
            project(x + s, y, z),
            project(x + s, y, z + s),
            project(x + s, yTop, z + s),
            project(x + s, yTop, z),
          ],
        },
        {
          n: [-1, 0],
          fill: pal.right,
          pts: [
            project(x, y, z),
            project(x, y, z + s),
            project(x, yTop, z + s),
            project(x, yTop, z),
          ],
        },
        {
          n: [0, 1],
          fill: pal.left,
          pts: [
            project(x, y, z + s),
            project(x + s, y, z + s),
            project(x + s, yTop, z + s),
            project(x, yTop, z + s),
          ],
        },
        {
          n: [0, -1],
          fill: pal.left,
          pts: [
            project(x, y, z),
            project(x + s, y, z),
            project(x + s, yTop, z),
            project(x, yTop, z),
          ],
        },
      ];

      for (const f of sides) {
        if (!facingCamera(f.n[0], f.n[1])) continue;
        if (isSolid(x + f.n[0], y, z + f.n[1])) continue;
        pathPoly(c, f.pts);
        c.fillStyle = f.fill;
        c.fill();
      }

      c.strokeStyle = PAL.inkLine;
      c.lineWidth = 0.5;
      pathPoly(c, top);
      c.stroke();
    };

    /** Fit: projected bounds of ALL blocks at the current azimuth. */
    const computeView = (): void => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const b of BLOCKS) {
        const yTop = b.flat ? b.y : b.y + b.s;
        const corners: Array<[number, number, number]> = [
          [b.x, 0, b.z],
          [b.x + b.s, 0, b.z + b.s],
          [b.x, yTop, b.z],
          [b.x + b.s, yTop, b.z + b.s],
        ];
        for (const [cx, cy, cz] of corners) {
          const dx = cx - CENTRE.x;
          const dz = cz - CENTRE.z;
          const rx = dx * Math.cos(az) - dz * Math.sin(az);
          const rz = dx * Math.sin(az) + dz * Math.cos(az);
          const sx = (rx - rz) * (TW / 2);
          const sy = (rx + rz) * (TH / 2) - cy * TZ;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }
      }
      const padX = 16;
      const padTop = 26;
      const padBottom = 14;
      const bw = maxX - minX + padX * 2;
      const bh = maxY - minY + padTop + padBottom;
      scale = Math.min(w / bw, h / bh) * zoom;
      ox = (w - bw * scale) / 2 - minX * scale + padX * scale;
      oy = (h - bh * scale) / 2 - minY * scale + padTop * scale;
    };

    const renderStatic = (): void => {
      staticCanvas.width = Math.max(1, Math.round(w * dpr));
      staticCanvas.height = Math.max(1, Math.round(h * dpr));
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, w, h);
      const sorted = [...BLOCKS].sort(
        (a, b) => depth(a.x, a.z) - depth(b.x, b.z) || a.y - b.y,
      );
      for (const b of sorted) {
        drawBlockOn(sctx, b);
      }
    };

    const resize = (): void => {
      const rect = el.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) return;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeView();
      renderStatic();
    };

    const drawFlowers = (): void => {
      for (const f of FLOWERS) {
        const [sx, sy] = project(f.x, 1.06, f.z);
        ctx.fillStyle = f.c;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
    };

    const drawWater = (t: number): void => {
      const x0 = POOL[0]?.[0] ?? 5;
      const z0 = POOL[0]?.[1] ?? 5;
      const yTop = WATER_Y + 0.002;
      const pts: Array<[number, number]> = [
        project(x0, yTop, z0),
        project(x0 + 2, yTop, z0),
        project(x0 + 2, yTop, z0 + 2),
        project(x0, yTop, z0 + 2),
      ];
      pathPoly(ctx, pts);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.1 + 0.08 * Math.sin(t * 2)).toFixed(3)})`;
      ctx.fill();

      const g = (Math.sin(t * 0.9) + 1) / 2;
      const gx = x0 + 0.3 + g * 1.1;
      const gz = z0 + 1.1 - g * 0.6;
      const glint: Array<[number, number]> = [
        project(gx - 0.14, yTop + 0.002, gz - 0.07),
        project(gx + 0.14, yTop + 0.002, gz + 0.07),
        project(gx + 0.14, yTop + 0.002, gz + 0.21),
        project(gx - 0.14, yTop + 0.002, gz + 0.07),
      ];
      pathPoly(ctx, glint);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fill();
    };

    /** The ghost block — bobbing at home, or hopping to its clicked tile. */
    const ghostPosition = (t: number): { x: number; y: number; z: number } => {
      if (hop) {
        const p = Math.min((t - hop.t0) / hop.dur, 1);
        const ease = p * p * (3 - 2 * p);
        return {
          x: hop.fx + (hop.tx - hop.fx) * ease,
          y: 1.7 + Math.sin(Math.PI * p) * 1.3,
          z: hop.fz + (hop.tz - hop.fz) * ease,
        };
      }
      if (reducedMotion) return { x: HOP_HOME.x, y: 1.7, z: HOP_HOME.z };
      return {
        x: HOP_HOME.x,
        y: 1.7 + (3 * Math.sin(t * 1.2)) / (TZ * scale || 1),
        z: HOP_HOME.z,
      };
    };

    const drawGhost = (t: number): void => {
      const pos = ghostPosition(t);
      const s = 1;
      const x = pos.x - s / 2;
      const z = pos.z - s / 2;
      const y = pos.y;
      const yt = y + s;

      const c000 = project(x, y, z);
      const c100 = project(x + s, y, z);
      const c110 = project(x + s, y, z + s);
      const c010 = project(x, y, z + s);
      const c001 = project(x, yt, z);
      const c101 = project(x + s, yt, z);
      const c111 = project(x + s, yt, z + s);
      const c011 = project(x, yt, z + s);
      const edges: Array<[[number, number], [number, number]]> = [
        [c000, c100],
        [c100, c110],
        [c110, c010],
        [c010, c000],
        [c001, c101],
        [c101, c111],
        [c111, c011],
        [c011, c001],
        [c000, c001],
        [c100, c101],
        [c110, c111],
        [c010, c011],
      ];

      // ground shadow tracks the cube, dimming as it lifts
      const lift = Math.max(0, pos.y - 1.7);
      const shrink = 1 - Math.min(0.4, lift * 0.3);
      const cxw = x + s / 2;
      const czw = z + s / 2;
      const sc = (v: number, c: number): number => c + (v - c) * shrink;
      const shadow: Array<[number, number]> = [
        project(sc(x + 0.08, cxw), WATER_Y + 0.02, sc(z + 0.08, czw)),
        project(sc(x + s - 0.08, cxw), WATER_Y + 0.02, sc(z + 0.08, czw)),
        project(sc(x + s - 0.08, cxw), WATER_Y + 0.02, sc(z + s - 0.08, czw)),
        project(sc(x + 0.08, cxw), WATER_Y + 0.02, sc(z + s - 0.08, czw)),
      ];
      pathPoly(ctx, shadow);
      ctx.fillStyle = PAL.shadow;
      ctx.fill();

      const back: Array<[number, number]> = [c001, c101, c111, c011];
      pathPoly(ctx, back);
      ctx.fillStyle = 'rgba(78, 119, 0, 0.07)';
      ctx.fill();

      ctx.strokeStyle = PAL.ghost;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (const [a, b2] of edges) {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b2[0], b2[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawTargetRing = (t: number): void => {
      if (!hop) return;
      const h = hop; // narrow into a const — `hop` is reassignable, closures can't narrow
      const p = Math.min((t - h.t0) / h.dur, 1);
      const ring = (radius: number, alpha: number): void => {
        const pts: Array<[number, number]> = [
          project(h.tx + 0.5 - radius, 1.03, h.tz + 0.5 - radius),
          project(h.tx + 0.5 + radius, 1.03, h.tz + 0.5 - radius),
          project(h.tx + 0.5 + radius, 1.03, h.tz + 0.5 + radius),
          project(h.tx + 0.5 - radius, 1.03, h.tz + 0.5 + radius),
        ];
        pathPoly(ctx, pts);
        ctx.strokeStyle = `rgba(78, 119, 0, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      ring(0.45, 0.9);
      ring(0.45 + (1 - p) * 0.5, 0.35);
    };

    const drawDebris = (t: number): void => {
      const toWorld = (px: number): number => px / (TZ * scale || 1);
      const bobA = reducedMotion ? 0 : toWorld(2.2 * Math.sin(t * 1.5 + 1.7));
      const bobB = reducedMotion ? 0 : toWorld(2.6 * Math.sin(t * 1.3 + 3.9));
      drawBlockOn(ctx, { x: 4.35, y: 1.15 + bobA, z: 6.35, s: 0.4, pal: PAL.stone });
      drawBlockOn(ctx, { x: 6.6, y: 1.4 + bobB, z: 4.3, s: 0.4, pal: PAL.bloomA });
    };

    const drawPetalShape = (
      sx: number,
      sy: number,
      size: number,
      color: string,
      alpha: number,
    ): void => {
      const s = size / 2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(sx, sy - s * 0.5);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx, sy + s * 0.5);
      ctx.lineTo(sx - s, sy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const updateAndDrawPetals = (t: number, dt: number): void => {
      for (const p of PETALS) {
        const gx =
          p.tx + p.ox + Math.sin(t * 1.1 + p.swayPhase) * p.swayAmp + windX * 0.9;
        const gz =
          p.tz +
          p.oz +
          Math.cos(t * 0.9 + p.swayPhase) * p.swayAmp * 0.6 +
          windX * 0.3;
        const [psx, psy] = project(gx, p.y, gz);
        const [tx2, ty2] = project(gx - windX * 0.3, p.y + p.speed * dt * 0.8, gz);
        drawPetalShape(tx2, ty2, p.size, p.color, 0.3);
        drawPetalShape(psx, psy, p.size, p.color, 1);
        if (!reducedMotion) {
          p.y -= p.speed * dt;
          if (p.y <= 1.02) p.y = 5.2 + ((p.speed * 100) % 10) / 10;
        }
      }
    };

    const drawBursts = (dt: number): void => {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        if (!b) continue;
        b.life -= dt;
        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vy -= 6 * dt;
        const [sx, sy] = project(b.x, Math.max(b.y, 1.03), b.z);
        drawPetalShape(sx, sy, b.size, b.color, Math.min(1, b.life / b.maxLife));
      }
    };

    const spawnBurst = (x: number, z: number): void => {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + hops * 0.7;
        const speed = 1.4 + ((i * 37) % 100) / 100 * 1.2;
        bursts.push({
          x,
          y: 1.9,
          z,
          vx: Math.cos(angle) * speed * 0.6,
          vy: 2.2 + ((i * 53) % 100) / 100 * 1.4,
          vz: Math.sin(angle) * speed * 0.6,
          life: 0.85,
          maxLife: 0.85,
          size: 3.5 + ((i * 19) % 100) / 100 * 2.5,
          color: PETAL_COLORS[i % 3] ?? PETAL_COLORS[0],
        });
      }
    };

    /** Click a tile → the ghost block hops there. True if it moved. */
    const wanderTo = (sx: number, sy: number): boolean => {
      // invert the projection onto the ground plane (grass top, y = 1)
      const a = (TW / 2) * scale;
      const b = (TH / 2) * scale;
      const c = TZ * scale;
      const u = (sx - ox) / a;
      const v = (sy - oy + c) / b;
      const rx = (u + v) / 2;
      const rz = (v - u) / 2;
      const wx = rx * Math.cos(az) + rz * Math.sin(az) + CENTRE.x;
      const wz = -rx * Math.sin(az) + rz * Math.cos(az) + CENTRE.z;
      const tx = Math.round(wx - 0.5);
      const tz = Math.round(wz - 0.5);
      if (tx < 0 || tx > 10 || tz < 0 || tz > 10) return false;
      // pool cells are allowed — the ghost floats over water (its home is there)

      const from = ghostPosition(performance.now() / 1000);
      hop = {
        fx: from.x,
        fz: from.z,
        tx: tx + 0.5,
        tz: tz + 0.5,
        t0: performance.now() / 1000,
        dur: 0.55,
      };
      hops++;
      el.dataset.hops = String(hops);
      return true;
    };

    let lastStaticKey = '';

    const renderAll = (t: number, dt: number): void => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(staticCanvas, 0, 0, w, h);
      drawFlowers();
      drawWater(t);
      drawTargetRing(t);
      drawGhost(t);
      drawDebris(t);
      updateAndDrawPetals(t, dt);
      drawBursts(dt);
      el.dataset.view = `${((az * 180) / Math.PI).toFixed(0)}|${zoom.toFixed(2)}`;
    };

    // — boot —
    resize();
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let running = false;

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !visible) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      az += (azTarget - az) * Math.min(1, dt * 12);
      zoom += (zoomTarget - zoom) * Math.min(1, dt * 10);
      windX *= Math.exp(-2.5 * dt);

      const key = `${az.toFixed(4)}|${zoom.toFixed(4)}`;
      if (key !== lastStaticKey) {
        computeView();
        renderStatic();
        lastStaticKey = key;
      }
      renderAll(now / 1000, dt);
    };

    const start = (): void => {
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = (): void => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        visible = e.isIntersecting;
      }
    });
    io.observe(el);

    // — interaction: drag = orbit, wheel = zoom, quick click = wander —
    let dragging = false;
    let moved = 0;
    let downAt = 0;
    let lastX = 0;

    const rerenderNow = (): void => {
      computeView();
      renderStatic();
      lastStaticKey = `${az.toFixed(4)}|${zoom.toFixed(4)}`;
      renderAll(performance.now() / 1000, 0.016);
    };

    const onPointerDown = (e: PointerEvent): void => {
      dragging = true;
      moved = 0;
      downAt = performance.now();
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent): void => {
      const dx = e.clientX - lastX;
      if (dragging) {
        azTarget += dx * AZ_SPIN;
        moved += Math.abs(dx);
        if (reducedMotion) {
          az = azTarget;
          rerenderNow();
        }
      } else {
        // ambient wind from cursor velocity
        windX = Math.max(-1.4, Math.min(1.4, windX + dx * 0.02));
      }
      lastX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      const quick = performance.now() - downAt < 320;
      if (quick && moved < 8) {
        const rect = el.getBoundingClientRect();
        if (wanderTo(e.clientX - rect.left, e.clientY - rect.top) && hop) {
          spawnBurst(hop.tx, hop.tz);
          if (reducedMotion) renderAll(performance.now() / 1000, 0.016);
        }
      }
    };
    const onLeave = (): void => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent): void => {
      // the band is an interactive viewer — wheel zooms instead of page-scroll
      e.preventDefault();
      zoomTarget = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, zoomTarget - e.deltaY * 0.0016),
      );
      if (reducedMotion) {
        zoom = zoomTarget;
        rerenderNow();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });

    if (reducedMotion) {
      renderAll(0, 0);
      el.dataset.drawn = '1';
    } else {
      renderAll(0, 0.016);
      el.dataset.drawn = '1';
      start();
    }

    const onResize = (): void => {
      resize();
      if (reducedMotion) renderAll(0, 0);
    };
    window.addEventListener('resize', onResize);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
      el.removeEventListener('wheel', onWheel);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={ref}
      data-testid="error-404-canvas"
      aria-hidden
      className={cn('touch-none cursor-grab active:cursor-grabbing', className)}
    />
  );
}
