/**
 * Real-AI smoke test for the BAML masterclass pipeline (no DB writes).
 *
 * Usage: cd packages/backend && pnpm exec tsx scripts/ai-smoke.ts [path-to-pdf]
 * Requires OPENROUTER_API_KEY in backend .env. Do NOT set AI_MOCK.
 * Makes ~3 LLM calls (analyze, outline, one lesson) — small cost.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { b } from '@reka-bytes/baml';
import { chunkText } from '../src/services/ai/chunks';
import { getBamlRegistry } from '../src/services/ai/baml-env';

const bamlOpts = { clientRegistry: getBamlRegistry() };

const pdfPath = process.argv[2] ?? '../../e2e/tests/fixtures/curriculum.pdf';
const classTitle = process.argv[3] ?? 'Smoke Test Class';

let text: string;
if (pdfPath.toLowerCase().endsWith('.pdf')) {
  const data = new Uint8Array(await readFile(pdfPath));
  const parser = new PDFParse({ data });
  text = (await parser.getText()).text;
  await parser.destroy();
} else {
  text = await readFile(pdfPath, 'utf8');
}

const chunks = chunkText(text);
console.log(`extracted ${text.length} chars → ${chunks.length} chunks`);

console.log('\n── pass 1 · AnalyzeDocument ──');
const analysis = await b.AnalyzeDocument(
  chunks.map((c) => c.text),
  bamlOpts,
);
console.log('summary:', analysis.summary);
for (const t of analysis.topics) {
  console.log(
    `  [${t.coverage}]${t.needs_expansion ? ' (needs expansion)' : ''} ${t.title} — ${t.notes}`,
  );
}
console.log('prerequisites:', analysis.prerequisites);
console.log('warnings:', analysis.warnings);

console.log('\n── pass 2 · GenerateOutline ──');
const outline = await b.GenerateOutline(
  classTitle,
  analysis,
  chunks.map((c) => c.text),
  bamlOpts,
);
for (const m of outline.modules) {
  console.log(`\n${m.title}`);
  for (const l of m.lessons) {
    console.log(`  - ${l.title} (${l.estimated_minutes}min, chunks: ${l.chunk_refs.join(',')})`);
    for (const o of l.objectives) console.log(`      · ${o}`);
  }
}

const first = outline.modules[0]?.lessons[0];
if (first) {
  console.log(`\n── pass 3 · WriteLesson ("${first.title}") ──`);
  const excerpt = first.chunk_refs
    .filter((i) => i >= 0 && i < chunks.length)
    .map((i) => `[chunk ${i}] ${chunks[i]?.text}`)
    .join('\n\n');
  const lesson = await b.WriteLesson(
    classTitle,
    outline.modules[0]?.title ?? 'Module 1',
    first.title,
    first.objectives,
    excerpt,
    analysis.summary,
    bamlOpts,
  );
  const words = lesson.content_markdown.split(/\s+/).length;
  console.log(`lesson written: ${words} words, ${lesson.key_terms.length} key terms`);
  console.log('--- first 40 lines ---');
  console.log(lesson.content_markdown.split('\n').slice(0, 40).join('\n'));
}

console.log('\n✅ smoke test passed');
