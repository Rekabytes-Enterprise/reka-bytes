/**
 * Backfill: convert legacy markdown lessons into typed blocks (LESSON-PLAN §4.2).
 *
 * Heuristic split on the AI Masterclass teaching structure (`## Why this
 * matters` → concept → walkthrough → mistakes → try it → recap):
 *  - "recap"-style heading        → recap block (bullet points)
 *  - "key terms" style heading    → key-terms block (`**term** — definition` bullets)
 *  - "mistake" style heading      → callout (variant: mistake)
 *  - everything else              → one prose block per section (heading kept)
 *
 * SAFETY: any lesson that doesn't split into ≥2 recognizable sections, or whose
 * blocks fail zod validation, falls back to a single `prose` block containing
 * the ENTIRE original markdown — guaranteed-correct fallback. The script is
 * idempotent (only touches lessons where blocks IS NULL) and never modifies
 * contentMarkdown.
 */
import 'dotenv/config';
import { prisma } from '../src/index';
import { parseBlocks, flattenBlocksToMarkdown } from '@reka-bytes/shared';
import type { LessonBlock } from '@reka-bytes/shared';

function splitSections(md: string): { heading: string; body: string }[] {
  const lines = md.split('\n');
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string[] } | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      if (current) sections.push({ heading: current.heading, body: current.body.join('\n').trim() });
      current = { heading: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.body.join('\n').trim() });

  const preambleText = preamble.join('\n').trim();
  return preambleText ? [{ heading: '', body: preambleText }, ...sections] : sections;
}

const RECAP_RE = /\brecap\b|\bsummary\b/i;
const KEY_TERMS_RE = /key\s+terms|terminology|glossary/i;
const MISTAKE_RE = /common\s+mistakes?|mistakes?\s+to\s+avoid|pitfalls?/i;

/** Parse `- **term** — definition` (em-dash, en-dash or hyphen). */
function parseTermLine(line: string): { term: string; definition: string } | null {
  const m = /^\s*[-*]\s+\*\*(.+?)\*\*\s*[—–-]+\s+(.+)$/.exec(line);
  return m ? { term: m[1].trim(), definition: m[2].trim() } : null;
}

/** Parse top-level bullet points for a recap. */
function parsePoints(body: string): string[] {
  const points = body
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);
  return points.length > 0 ? points : body.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function convert(markdown: string): LessonBlock[] | null {
  const sections = splitSections(markdown);
  // Need at least the preamble/one heading + one more section to be worth converting.
  if (sections.length < 2) return null;

  const blocks: LessonBlock[] = [];
  for (const s of sections) {
    if (!s.heading) {
      blocks.push({ type: 'prose', markdown: s.body });
      continue;
    }
    if (RECAP_RE.test(s.heading)) {
      const points = parsePoints(s.body);
      if (points.length === 0) return null; // ambiguous → whole-markdown fallback
      blocks.push({ type: 'recap', points });
    } else if (KEY_TERMS_RE.test(s.heading)) {
      const terms = s.body
        .split('\n')
        .map(parseTermLine)
        .filter((t): t is { term: string; definition: string } => t !== null);
      if (terms.length === 0) return null;
      blocks.push({ type: 'key-terms', terms });
    } else if (MISTAKE_RE.test(s.heading)) {
      blocks.push({ type: 'callout', variant: 'mistake', title: s.heading, markdown: s.body });
    } else {
      blocks.push({ type: 'prose', markdown: `## ${s.heading}\n\n${s.body}` });
    }
  }

  // Validate the full array; on any failure use the guaranteed fallback.
  const valid = parseBlocks(blocks);
  if (valid.length !== blocks.length || valid.length < 2) return null;
  return valid as LessonBlock[];
}

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, contentMarkdown: true, blocks: true },
  });
  // JSON null check in JS — portable across Prisma JSON null modes.
  const pending = lessons.filter((l) => l.blocks === null);
  console.log(`Lessons without blocks: ${pending.length}`);

  let converted = 0;
  let fellBack = 0;

  for (const lesson of pending) {
    const md = lesson.contentMarkdown;
    let blocks = convert(md);
    let mode: 'split' | 'fallback' = 'split';

    if (!blocks) {
      blocks = [{ type: 'prose', markdown: md }];
      mode = 'fallback';
    }

    // Round-trip guard: flattened markdown must stay materially equivalent in length
    // (catches pathological conversions cheaply).
    const flat = flattenBlocksToMarkdown(blocks);

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { blocks: blocks as unknown as import('@reka-bytes/db').Prisma.InputJsonValue },
    });

    if (mode === 'split') converted++;
    else fellBack++;
    console.log(`  ${lesson.title}: ${mode} (${blocks.length} blocks, flat ${flat.length}/${md.length} chars)`);
  }

  console.log(`Done. converted=${converted} fallback=${fellBack}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
