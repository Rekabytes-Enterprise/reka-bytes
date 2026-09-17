import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import {
  AppError,
  computeReadMinutes,
  parseJournalFile,
  parseWidgetFence,
  rewriteCoverPath,
  rewriteJournalAssetPaths,
  type JournalAdminRow,
  type JournalMeta,
  type JournalPostDetail,
  type JournalPostSummary,
} from '@reka-bytes/shared';
import { env } from '../env';
import { hardenSceneHtml } from './scene-hardening';

/**
 * Public studio journal (PRD-07 §3.2) — a filesystem-backed content service.
 *
 * Content lives in the repo under `content/journal/` as Markdown files with
 * YAML frontmatter; the commit IS the publication (no CMS, no DB). This
 * service scans the directory lazily and caches the parsed result for 60s,
 * which is well within the publishing cadence (a new post = a new deploy,
 * dev edits land within a minute).
 *
 * Widget HTML under `<folder>/widgets/*.html` is hardened HERE, at
 * cache-build time, with the same pipeline as lesson scenes
 * (`hardenSceneHtml`: static gate + CSP meta + height reporter). The asset
 * route serves the hardened in-memory copy as plain text — raw files on disk
 * are never served, and a failed gate means the widget 404s, which makes the
 * frontend fall back to the fence's `fallback` markdown.
 */

const CACHE_TTL_MS = 60_000;
const WIDGETS_DIR = 'widgets';

/** Repo-root `content/journal` in dev and Docker alike (resolve from cwd:
 *  dev runs from packages/backend, the runner image WORKDIRs the same). */
function journalDir(): string {
  if (env.JOURNAL_DIR) return resolve(env.JOURNAL_DIR);
  // backend/src/services -> backend/src -> backend -> packages -> repo root
  return resolve(import.meta.dirname, '../../../../content/journal');
}

interface CachedPost {
  meta: JournalMeta;
  /** `YYYY-MM-DD-{slug}` — also the asset folder name. */
  folder: string;
  /** Filename on disk (`{folder}.md`) — admin GitHub links. */
  file: string;
  body: string;
  readMinutes: number;
  rewritten: string;
}

interface JournalCache {
  builtAt: number;
  /** All parseable posts, newest-first; featured first regardless of date. */
  posts: CachedPost[];
  /** `{folder}/widgets/{file}` → hardened html. */
  widgets: Map<string, string>;
  warnings: string[];
}

let cache: JournalCache | null = null;

function sortPosts(posts: CachedPost[]): CachedPost[] {
  return [...posts].sort((a, b) => {
    if (a.meta.featured !== b.meta.featured) return a.meta.featured ? -1 : 1;
    return b.meta.publishedAt.localeCompare(a.meta.publishedAt);
  });
}

function buildCache(): JournalCache {
  const next: JournalCache = {
    builtAt: Date.now(),
    posts: [],
    widgets: new Map(),
    warnings: [],
  };
  const dir = journalDir();
  if (!existsSync(dir)) {
    next.warnings.push(`journal directory not found: ${dir}`);
    return next;
  }

  for (const filename of readdirSync(dir)) {
    if (!filename.endsWith('.md')) continue;
    const raw = readFileSync(join(dir, filename), 'utf8');
    const result = parseJournalFile(filename, raw);
    if (!result.ok) {
      next.warnings.push(`${filename}: ${result.error}`);
      continue;
    }
    const post = result.post;
    next.posts.push({
      meta: post.meta,
      folder: post.folder,
      file: post.file,
      body: post.body,
      readMinutes: computeReadMinutes(post.body),
      rewritten: rewriteJournalAssetPaths(post.body, post.folder),
    });

    // Harden every widget the post ships with. A gate failure is a warning
    // (asset route 404 → renderer shows the fence's fallback), never a crash.
    const widgetDir = join(dir, post.folder, WIDGETS_DIR);
    if (existsSync(widgetDir) && statSync(widgetDir).isDirectory()) {
      for (const wf of readdirSync(widgetDir)) {
        if (extname(wf).toLowerCase() !== '.html') continue;
        const source = readFileSync(join(widgetDir, wf), 'utf8');
        const hardened = hardenSceneHtml(source);
        const key = `${post.folder}/${WIDGETS_DIR}/${wf}`;
        if (hardened === null) {
          next.warnings.push(`${key}: failed scene static gate — widget disabled`);
        } else {
          next.widgets.set(key, hardened);
        }
      }
    }
  }

  next.posts = sortPosts(next.posts);
  for (const w of next.warnings) console.warn(`[journal] ${w}`);
  return next;
}

function getCache(): JournalCache {
  if (!cache || Date.now() - cache.builtAt > CACHE_TTL_MS) cache = buildCache();
  return cache;
}

// ── DTO mapping ────────────────────────────────────────────────

function toSummary(post: CachedPost): JournalPostSummary {
  return {
    slug: post.meta.slug,
    title: post.meta.title,
    excerpt: post.meta.excerpt,
    publishedAt: post.meta.publishedAt,
    tags: post.meta.tags,
    featured: post.meta.featured,
    coverImage: rewriteCoverPath(post.meta.coverImage, post.folder),
    readMinutes: post.readMinutes,
  };
}

function publishedPosts(): CachedPost[] {
  return getCache().posts.filter((p) => p.meta.status === 'published');
}

// ── Public API surface ─────────────────────────────────────────

export interface JournalListOptions {
  page?: string | undefined;
  limit?: string | undefined;
  tag?: string | undefined;
}

export function listPosts(options: JournalListOptions = {}) {
  let posts = publishedPosts();
  const tag = options.tag?.trim().toLowerCase();
  if (tag) posts = posts.filter((p) => p.meta.tags.includes(tag));

  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const page = Math.max(1, Number(options.page) || 1);
  const totalPages = Math.max(1, Math.ceil(posts.length / limit));
  const clamped = Math.min(page, totalPages);
  const slice = posts.slice((clamped - 1) * limit, clamped * limit);

  return {
    posts: slice.map(toSummary),
    page: clamped,
    limit,
    total: posts.length,
    totalPages,
  };
}

export function getFeaturedPost(): JournalPostSummary | null {
  const featured = publishedPosts().find((p) => p.meta.featured);
  return featured ? toSummary(featured) : null;
}

export function getPostBySlug(slug: string): JournalPostDetail {
  const c = getCache();
  const post = c.posts.find((p) => p.meta.status === 'published' && p.meta.slug === slug);
  if (!post) throw AppError.notFound('Post not found');
  return { ...toSummary(post), body: post.rewritten, widgetHtml: collectWidgetHtml(post, c) };
}

/**
 * Extract the fence `src`s from the rewritten body and ship the hardened
 * widget HTML inline (keyed by its asset URL) so the renderer never needs a
 * second fetch per widget. Fences pointing at missing/gated widgets are
 * skipped — the renderer shows the fence's own fallback for those.
 */
function collectWidgetHtml(post: CachedPost, c: JournalCache): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of post.rewritten.matchAll(/```widget\n([\s\S]*?)```/g)) {
    const fence = parseWidgetFence(match[1] ?? '');
    if (!fence) continue;
    const prefix = '/api/public/journal-assets/';
    if (!fence.src.startsWith(prefix)) continue;
    const hardened = c.widgets.get(fence.src.slice(prefix.length));
    if (hardened) out[fence.src] = hardened;
  }
  return out;
}

// ── Admin surface (drafts + file paths + warnings) ─────────────

export function listAllPostsAdmin(): { posts: JournalAdminRow[]; warnings: string[] } {
  const c = getCache();
  return {
    posts: c.posts.map((p) => ({
      ...toSummary(p),
      status: p.meta.status,
      file: p.file,
    })),
    warnings: c.warnings,
  };
}

// ── Asset serving ──────────────────────────────────────────────

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export interface JournalAsset {
  body: Uint8Array | string;
  contentType: string;
}

/**
 * Serve one journal asset by `<folder>/<relative-path>` (already stripped of
 * the route prefix). Hardened widgets come from the cache as TEXT (never
 * HTML — the frontend feeds the string into a sandboxed srcdoc iframe);
 * images stream from disk with traversal protection.
 */
export function getJournalAsset(relPath: string): JournalAsset {
  const c = getCache();
  const parts = relPath.split('/');
  const folder = parts[0];
  if (!folder || parts.some((s) => s === '..' || s === '')) {
    throw AppError.notFound('Asset not found');
  }

  // Widgets: only ever the hardened, cached copy.
  if (parts.length === 3 && parts[1] === WIDGETS_DIR) {
    const hardened = c.widgets.get(relPath);
    if (hardened === undefined) throw AppError.notFound('Asset not found');
    return { body: hardened, contentType: 'text/plain; charset=utf-8' };
  }

  // Images: co-located with the post folder, known extensions only.
  if (parts.length !== 2) throw AppError.notFound('Asset not found');
  const ext = extname(parts[1] ?? '').toLowerCase();
  const contentType = IMAGE_TYPES[ext];
  if (!contentType) throw AppError.notFound('Asset not found');

  const dir = journalDir();
  const abs = resolve(dir, relPath);
  if (!abs.startsWith(resolve(dir) + '/') || !existsSync(abs) || !statSync(abs).isFile()) {
    throw AppError.notFound('Asset not found');
  }
  return { body: new Uint8Array(readFileSync(abs)), contentType };
}
