import { z } from 'zod';
import { load as yamlLoad } from 'js-yaml';

/**
 * Public studio journal (PRD-07) — file format, parsing, and path rewriting.
 *
 * Journal content lives in the repo as Markdown files under
 * `content/journal/{YYYY-MM-DD}-{slug}.md` with YAML frontmatter. The commit
 * IS the publication — there is no CMS and no DB table for content. This
 * module is the single source of truth for the file contract shared by the
 * backend service (reads + caches + rewrites), the frontend (renders), and
 * the admin console (read-only list).
 *
 * Asset paths in authored markdown are RELATIVE (`./image.png`, widget
 * `src: ./widgets/foo.html`). `rewriteJournalAssetPaths` converts them to
 * same-origin `/api/public/journal-assets/{folder}/…` URLs before the body
 * reaches a renderer, so the shared `Markdown` component stays untouched.
 */

// ── Filename convention ────────────────────────────────────────

/** `2026-09-15-shipping-v0-1-0.md` — date prefix + kebab slug + .md */
const JOURNAL_FILE_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_PATH_RE = /^\.\/[A-Za-z0-9_\-./ ]+$/;

// ── Frontmatter schema ─────────────────────────────────────────

export const journalStatusSchema = z.enum(['draft', 'published']);
export type JournalStatus = z.infer<typeof journalStatusSchema>;

const publishedAtSchema = z
  .union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

export const journalMetaSchema = z
  .object({
    slug: z.string().regex(SLUG_RE),
    title: z.string().min(1).max(200),
    excerpt: z.string().min(1).max(280),
    publishedAt: publishedAtSchema,
    featured: z.boolean().default(false),
    tags: z.array(z.string().regex(SLUG_RE)).max(8).default([]),
    /** Relative path inside the post folder, e.g. `./cover.png`. */
    coverImage: z.string().regex(ASSET_PATH_RE).optional(),
    status: journalStatusSchema.default('draft'),
  })
  .strict(); // unknown keys (typos) fail the parse loudly

export type JournalMeta = z.infer<typeof journalMetaSchema>;

// ── File parsing ───────────────────────────────────────────────

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface JournalFile {
  meta: JournalMeta;
  /** Markdown body after frontmatter, authored as-is (relative paths intact). */
  body: string;
  /** `2026-09-15-{slug}` — folder name holding this post's assets. */
  folder: string;
  /** Filename on disk (admin GitHub links). */
  file: string;
}

export type JournalParseResult = { ok: true; post: JournalFile } | { ok: false; error: string };

/**
 * Parse one journal file. Every failure mode is a soft skip (the backend
 * service logs a warning and excludes the post — one bad file never breaks
 * the journal).
 */
export function parseJournalFile(filename: string, raw: string): JournalParseResult {
  const fileMatch = JOURNAL_FILE_RE.exec(filename);
  const fileDate = fileMatch?.[1];
  const filenameSlug = fileMatch?.[2];
  if (!fileMatch || !fileDate || !filenameSlug) {
    return {
      ok: false,
      error: `filename "${filename}" must match YYYY-MM-DD-kebab-slug.md`,
    };
  }

  const fmMatch = FRONTMATTER_RE.exec(raw);
  if (!fmMatch || !fmMatch[1]) return { ok: false, error: 'missing or malformed frontmatter' };

  let parsed: unknown;
  try {
    parsed = yamlLoad(fmMatch[1]);
  } catch (e) {
    return { ok: false, error: `yaml error: ${e instanceof Error ? e.message : String(e)}` };
  }

  const result = journalMetaSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: `frontmatter invalid: ${first ? `${first.path.join('.')}: ${first.message}` : 'unknown'}`,
    };
  }

  const meta = result.data;
  if (meta.slug !== filenameSlug) {
    return {
      ok: false,
      error: `slug "${meta.slug}" does not match filename slug "${filenameSlug}"`,
    };
  }
  if (meta.publishedAt < fileDate) {
    return {
      ok: false,
      error: `publishedAt ${meta.publishedAt} is earlier than the filename date ${fileDate}`,
    };
  }

  const body = raw.slice(fmMatch[0].length);
  if (body.trim().length === 0) return { ok: false, error: 'empty body' };

  return { ok: true, post: { meta, body, folder: `${fileDate}-${filenameSlug}`, file: filename } };
}

// ── Asset path rewriting ───────────────────────────────────────

const JOURNAL_ASSET_BASE = '/api/public/journal-assets';

/**
 * Rewrite relative `./…` references to same-origin asset URLs. Handles:
 *  1. Inline markdown images: `![alt](./foo.png)` (optionally with title)
 *  2. ```widget fences: a `src:` line pointing at ./widgets/…
 * Only `./` prefixes are touched — absolute URLs and root paths pass through
 * (authors should not use them; they just are not rewritten).
 */
export function rewriteJournalAssetPaths(body: string, folder: string): string {
  const base = `${JOURNAL_ASSET_BASE}/${folder}/`;
  let out = body.replace(/(!\[[^\]]*\]\()\.\/([^)\s]+(?:\s+"[^"]*")?)(\))/g, `$1${base}$2$3`);
  out = out.replace(
    /(^|\n)(```widget\n)([\s\S]*?)(```)/g,
    (whole, pre, fence, inner, close) =>
      `${pre}${fence}${inner.replace(/(^|\n)src:[ \t]*\.\//, `$1src: ${base}`)}${close}`,
  );
  return out;
}

/** Rewrite a frontmatter coverImage (`./cover.png`) to an asset URL. */
export function rewriteCoverPath(coverImage: string | undefined, folder: string): string | null {
  if (!coverImage) return null;
  return `${JOURNAL_ASSET_BASE}/${folder}/${coverImage.replace(/^\.\//, '')}`;
}

/**
 * Does a rewritten widget `src` point at the journal asset route under the
 * expected folder? Guards the renderer against anything that slipped through
 * the rewriter (absolute URLs, traversal, other folders).
 */
export function isJournalAssetUrl(src: string, folder: string): boolean {
  const prefix = `${JOURNAL_ASSET_BASE}/${folder}/`;
  return src.startsWith(prefix) && !src.includes('..') && src.endsWith('.html');
}

// ── Widget fence (Phase 2) ─────────────────────────────────────

export const journalWidgetFenceSchema = z
  .object({
    src: z.string().min(1),
    title: z.string().min(1).max(200),
    brief: z.string().min(1).max(500),
    fallback: z.string().min(1).max(20_000),
  })
  .strict();
export type JournalWidgetFence = z.infer<typeof journalWidgetFenceSchema>;

/**
 * Parse the YAML inside a ```widget fence. Invalid fences degrade to null —
 * the renderer shows the fence as inert code text rather than crashing,
 * mirroring the lesson-side "a bad block never kills the lesson" rule.
 */
export function parseWidgetFence(source: string): JournalWidgetFence | null {
  try {
    const parsed = yamlLoad(source);
    const result = journalWidgetFenceSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ── Read time ──────────────────────────────────────────────────

/** ~220 wpm prose. Code fences and markdown syntax don't count as words. */
export function computeReadMinutes(body: string): number {
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/![[^\]]]*\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|()-]/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /\w/.test(w)).length;
  return Math.max(1, Math.ceil(words / 220));
}

// ── DTOs ───────────────────────────────────────────────────────

export interface JournalPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
  featured: boolean;
  coverImage: string | null;
  readMinutes: number;
}

export interface JournalPostDetail extends JournalPostSummary {
  /** Rewritten markdown body (asset paths absolute, widget fences resolvable). */
  body: string;
  /**
   * Hardened widget HTML keyed by its rewritten `/api/public/journal-assets/…`
   * src URL. Shipped inline so the renderer never fetches fence assets; a
   * fence whose src is missing here (gate failure) degrades to fallback.
   */
  widgetHtml: Record<string, string>;
}

/** Admin view — includes drafts and the on-disk filename. */
export interface JournalAdminRow extends JournalPostSummary {
  status: JournalStatus;
  file: string;
}

export interface JournalListDTO {
  posts: JournalPostSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JournalAdminListDTO {
  posts: JournalAdminRow[];
  warnings: string[];
}

/** Max published posts per page on the public list (PRD-07 §5.1). */
export const JOURNAL_PAGE_SIZE = 10;
