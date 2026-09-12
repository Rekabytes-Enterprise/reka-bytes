import { prisma } from '../../lib/prisma';
import {
  AppError,
  generatedClassSchema,
  parseBlock,
  flattenBlocksToMarkdown,
  type AIOutlineDTO,
  type GeneratedClass,
  type LessonBlock,
} from '@reka-bytes/shared';
import { Prisma, toJsonInput } from '@reka-bytes/db';
import type { GeneratedLesson } from '@reka-bytes/shared';
import {
  b,
  BamlValidationError,
  BamlClientHttpError,
  type ClassOutline,
  type DocumentAnalysis,
  type ModuleQuiz,
  type LessonBlockRaw as BamlLessonBlockRaw,
  type WrittenLesson as BamlWrittenLesson,
} from '@reka-bytes/baml';
import {
  appendProgress,
  completeJob,
  failJob,
  setReviewNotes,
  saveJob,
  pauseForApproval,
  getJob,
  toStatusDTO,
  type AIGenJob,
} from './jobs';
import { chunkText } from './chunks';
import { extractText } from './extract';
import { mockGeneratedClass, mockReviewNotes } from './mock-output';
import { getBamlRegistry } from './baml-env';
import { hardenSceneHtml } from '../scene-hardening';

/**
 * AI Masterclass pipeline (PRD-02 §5) — multi-pass via packages/baml, split
 * by an outline checkpoint so the admin signs off before the expensive passes:
 *
 *   Phase 1 (runGeneration):
 *     extract PDF → chunk → AnalyzeDocument → GenerateOutline → PAUSE
 *   ── checkpoint: job = awaiting_approval, admin reviews the outline ──
 *   Phase 2 (resumeGeneration, after approve):
 *     WriteLesson (per lesson, small parallel batches)
 *     → GenerateQuiz (per module, after its lessons exist)
 *     → single transactional DB write.
 *
 * Fire-and-forget: routes return immediately; this service updates the Redis
 * job as it works. Any failure fails the whole job — nothing partial is
 * ever persisted.
 */

/** Lessons written in parallel batches — bounds wall-clock time for big PDFs. */
const LESSON_CONCURRENCY = 4;

export async function runGeneration(job: AIGenJob, filePath: string | null): Promise<void> {
  try {
    const bamlOpts = { clientRegistry: getBamlRegistry() };
    const classTitle = job.classTitle;
    await appendProgress(job, `Starting generation for "${classTitle}"`);

    if (process.env.AI_MOCK === '1' || filePath === null) {
      await appendProgress(job, 'Mock mode: using deterministic fixture');
      const mock = mockGeneratedClass(classTitle);
      await setReviewNotes(job, mockReviewNotes());
      job.analysis = null;
      job.outline = mockClassToOutline(mock);
      await saveJob(job);
      const lessonTotal = mock.modules.reduce((s, m) => s + m.lessons.length, 0);
      await appendProgress(
        job,
        `Outline ready: ${mock.modules.length} modules · ${lessonTotal} lessons`,
      );
      await pauseForApproval(job);
      return;
    }
    {
      await appendProgress(job, 'Extracting text from PDF…');
      const sourceText = await extractText(filePath);
      const chunks = chunkText(sourceText);
      if (chunks.length === 0) throw new Error('The PDF contains no readable text');
      job.sourceChunks = chunks;
      await appendProgress(
        job,
        `Extracted ${sourceText.length} characters → ${chunks.length} section${chunks.length === 1 ? '' : 's'}`,
      );

      // ── Pass 1 · analyze ──
      await appendProgress(job, 'Analyzing the material…');
      const analysis = await withBamlRetry('AnalyzeDocument', () =>
        b.AnalyzeDocument(
          chunks.map((c) => c.text),
          bamlOpts,
        ),
      );
      await setReviewNotes(job, analysisToNotes(analysis));
      await appendProgress(job, `Analysis done — ${analysis.topics.length} topics found`);

      // ── Pass 2 · outline ──
      await appendProgress(job, 'Designing the course outline…');
      const outline = await withBamlRetry('GenerateOutline', () =>
        b.GenerateOutline(
          classTitle,
          analysis,
          chunks.map((c) => c.text),
          bamlOpts,
        ),
      );
      const lessonTotal = outline.modules.reduce((s, m) => s + m.lessons.length, 0);
      await appendProgress(
        job,
        `Outline ready: ${outline.modules.length} modules · ${lessonTotal} lessons`,
      );

      // ── Checkpoint · persist pass 1–2 outputs, pause for admin sign-off ──
      job.analysis = analysis;
      job.outline = outline;
      await saveJob(job);
      await pauseForApproval(job);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    await failJob(job, message);
    // Swallow — the route already returned; admin sees the error via polling.
    console.error('[ai-masterclass] generation failed:', message);
  }
}

/** Adapt the mock fixture to a ClassOutline so the checkpoint has real content in mock mode. */
function mockClassToOutline(mock: GeneratedClass): ClassOutline {
  return {
    modules: mock.modules.map((m) => ({
      title: m.title,
      description: `Module of "${mock.title}" (mock fixture).`,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        objectives: [`understand ${l.title.toLowerCase()}`],
        chunk_refs: [],
        estimated_minutes: l.durationMinutes,
      })),
    })),
  };
}

/**
 * Phase 2 — resume an approved job: write lessons, quiz modules, persist.
 * Fire-and-forget from the approve route; validates the checkpoint state.
 */
export async function resumeGeneration(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (job.status !== 'awaiting_approval') return; // already resumed/done — no-op
  job.status = 'processing';
  await saveJob(job);

  try {
    const bamlOpts = { clientRegistry: getBamlRegistry() };
    let generated: GeneratedClass;

    if (process.env.AI_MOCK === '1' || !job.outline || !job.analysis) {
      await appendProgress(job, 'Mock mode: using deterministic fixture');
      generated = mockGeneratedClass(job.classTitle);
    } else {
      await appendProgress(job, 'Outline approved — writing lessons…');
      generated = await writeLessonsAndQuizzes(
        job,
        job.classTitle,
        job.outline,
        job.sourceChunks.map((c) => c.text),
        job.analysis,
        bamlOpts,
      );
    }

    await appendProgress(job, 'Writing class to database…');
    const classId = await persistGeneratedClass(generated, job.jobId);
    await completeJob(job, classId);

    if (job.uploadPath) {
      const { deleteUpload } = await import('./extract');
      await deleteUpload(job.uploadPath).catch(() => undefined);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    await failJob(job, message);
    console.error('[ai-masterclass] resume failed:', message);
  }
}

/**
 * Regenerate the outline while the job sits at the checkpoint.
 * Re-runs GenerateOutline from the stored analysis + chunks (no re-analysis).
 */
export async function regenerateOutline(jobId: string): Promise<AIOutlineDTO> {
  const job = await getJob(jobId);
  if (job.status !== 'awaiting_approval') {
    throw AppError.badRequest('Job is not awaiting outline approval');
  }

  if (process.env.AI_MOCK === '1' || !job.analysis || job.sourceChunks.length === 0) {
    await appendProgress(job, 'Mock mode: outline regenerated from fixture');
  } else {
    const bamlOpts = { clientRegistry: getBamlRegistry() };
    // Local copies — TS narrowing of `job.analysis` doesn't survive into closures.
    const analysis = job.analysis;
    const chunkTexts = job.sourceChunks.map((c) => c.text);
    await appendProgress(job, 'Regenerating the course outline…');
    const outline = await withBamlRetry('GenerateOutline(regen)', () =>
      b.GenerateOutline(job.classTitle, analysis, chunkTexts, bamlOpts),
    );
    const lessonTotal = outline.modules.reduce((s, m) => s + m.lessons.length, 0);
    await appendProgress(
      job,
      `New outline ready: ${outline.modules.length} modules · ${lessonTotal} lessons`,
    );
    job.outline = outline;
  }
  await saveJob(job);
  const dto = toStatusDTO(job);
  if (!dto.outline) throw new Error('Outline missing after regeneration');
  return dto.outline;
}

function analysisToNotes(analysis: DocumentAnalysis): string[] {
  const notes: string[] = [analysis.summary];
  for (const t of analysis.topics) {
    notes.push(
      `${t.title} — ${t.coverage.toLowerCase()}${t.needs_expansion ? ' · needs expansion' : ''}: ${t.notes}`,
    );
  }
  if (analysis.prerequisites.length > 0) {
    notes.push(`Assumes but does not teach: ${analysis.prerequisites.join('; ')}`);
  }
  for (const w of analysis.warnings) notes.push(`Warning: ${w}`);
  return notes;
}

// ── Passes 3 & 4 ──────────────────────────────────────────────────────────

/** Exponential back-off helper. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generic retry wrapper for BAML passes. Retries `BamlValidationError`
 * (model returned malformed/non-JSON output) and `BamlClientHttpError`
 * (network errors, body-read timeouts, upstream 429/5xx) up to `maxRetries`
 * times with exponential back-off — one transient failure must not kill a
 * 20-minute generation job.
 *
 * `isValid` lets callers treat schema-empty results as failures (they get
 * retried too); the LAST attempt's result is always returned so the caller
 * can degrade gracefully instead of throwing.
 */
async function withBamlRetry<T>(
  label: string,
  attempt: () => Promise<T>,
  isValid?: (result: T) => boolean,
  maxRetries = 2,
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await attempt();
      if (!isValid || isValid(result) || i === maxRetries) return result;
      console.warn(`[ai-masterclass] ${label}: invalid result, retry ${i + 1}/${maxRetries}`);
      await sleep(1000 * 2 ** i);
    } catch (err) {
      const retryable = err instanceof BamlValidationError || err instanceof BamlClientHttpError;
      if (!retryable || i === maxRetries) throw err;
      const delay = (err instanceof BamlClientHttpError ? 2000 : 1000) * 2 ** i;
      console.warn(
        `[ai-masterclass] ${label} failed (${err instanceof Error ? err.message : String(err)}); retry ${i + 1}/${maxRetries} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw new Error('unreachable');
}

/** Wraps b.WriteLesson with retries via withBamlRetry (malformed JSON /
 *  network errors). The model occasionally returns non-JSON, malformed
 *  JSON or zero schema-valid blocks; retrying gives it a chance to
 *  self-correct without failing the whole generation job.
 *  Returns zod-valid LessonBlocks — the raw→typed mapping (ALL-CAPS enum →
 *  lowercase type, correct_index → correctIndex) happens here in ONE place. */
async function callWriteLesson(
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  objectives: string[],
  sourceExcerpt: string,
  analysisNotes: string,
  bamlOpts: { clientRegistry: ReturnType<typeof getBamlRegistry> },
): Promise<{ blocks: LessonBlock[]; key_terms: string[] }> {
  const written: BamlWrittenLesson = await withBamlRetry(
    'WriteLesson',
    () =>
      b.WriteLesson(
        courseTitle,
        moduleTitle,
        lessonTitle,
        objectives,
        sourceExcerpt,
        analysisNotes,
        bamlOpts,
      ),
    // Zero surviving blocks counts as an invalid attempt → retry; the final
    // attempt's (still empty) result is returned so we can degrade below.
    (w) => toLessonBlocks(w.blocks).length > 0,
  );
  const blocks = toLessonBlocks(written.blocks);
  if (blocks.length > 0) return { blocks, key_terms: written.key_terms };
  // Model responded but nothing survived validation after all retries —
  // degrade to single-prose so one lesson never fails the job.
  return { blocks: degradedFallback(written, lessonTitle), key_terms: written.key_terms };
}

const BLOCK_TYPE_MAP: Record<string, LessonBlock['type']> = {
  PROSE: 'prose',
  CALLOUT: 'callout',
  KEY_TERMS: 'key-terms',
  COMPARISON: 'comparison',
  MERMAID: 'mermaid',
  STEPS: 'steps',
  INLINE_CHECK: 'inline-check',
  WIDGET: 'widget',
  RECAP: 'recap',
};

/** Raw BAML block → shared zod block. Invalid entries are dropped silently —
 *  one malformed block must never fail a lesson (LESSON-PLAN §4.3). */
function toLessonBlocks(raw: BamlLessonBlockRaw[]): LessonBlock[] {
  const out: LessonBlock[] = [];
  let widgetSeen = false; // PRD-06: ≤ 1 scene per lesson — first valid one wins
  for (const item of raw ?? []) {
    const type = BLOCK_TYPE_MAP[item.type];
    if (!type) continue;
    let html: string | undefined;
    if (type === 'widget') {
      if (widgetSeen) continue;
      // Static gate + CSP/reporter injection in one step — a scene that fails
      // the check is dropped, never stored (PRD-06 §6).
      const hardened = hardenSceneHtml(item.html ?? '');
      if (!hardened) continue;
      html = hardened;
      widgetSeen = true;
    }
    const candidate = {
      ...item,
      type,
      ...(item.correct_index !== undefined && item.correct_index !== null
        ? { correctIndex: item.correct_index }
        : {}),
      ...(type === 'widget' && html !== undefined
        ? { html, fallbackMarkdown: item.fallback_markdown, reviewed: false as const }
        : {}),
    } as unknown;
    const parsed = parseBlock(candidate);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Last-resort degradation: salvage any text the model produced into one prose
 *  block so a lesson never fails to publish over its own formatting. */
function degradedFallback(written: BamlWrittenLesson, lessonTitle: string): LessonBlock[] {
  const text = (written.blocks ?? [])
    .map((b) => b.markdown ?? b.points?.join('\n') ?? '')
    .filter(Boolean)
    .join('\n\n');
  const markdown =
    text.trim().length >= 50
      ? text
      : `## ${lessonTitle}\n\nThe lesson body could not be structured — regenerate this lesson.`;
  return [{ type: 'prose', markdown: markdown.slice(0, 50_000) }];
}

interface WrittenModule {
  title: string;
  lessons: GeneratedLesson[];
  quiz: ModuleQuiz | null;
}

async function writeLessonsAndQuizzes(
  job: AIGenJob,
  classTitle: string,
  outline: ClassOutline,
  chunks: string[],
  analysis: DocumentAnalysis,
  bamlOpts: { clientRegistry: ReturnType<typeof getBamlRegistry> },
): Promise<GeneratedClass> {
  const modules: WrittenModule[] = [];
  const allLessons = outline.modules.flatMap((m, mi) =>
    m.lessons.map((l, li) => ({ module: m, moduleIndex: mi, lesson: l, lessonIndex: li })),
  );

  let completed = 0;
  const results = new Map<string, GeneratedLesson>();

  async function writeOne(entry: (typeof allLessons)[number]) {
    const at = (i: number): string => chunks[i] ?? chunks[0] ?? '';
    const excerpt =
      entry.lesson.chunk_refs.length > 0
        ? entry.lesson.chunk_refs
            .filter((i) => i >= 0 && i < chunks.length)
            .map((i) => `[chunk ${i}] ${at(i)}`)
            .join('\n\n')
            .slice(0, 24_000) || at(entry.moduleIndex)
        : at(entry.moduleIndex);

    const analysisNotes = [
      analysis.summary,
      ...analysis.topics
        .slice(0, 6)
        .map((t) => `${t.title} (${t.coverage.toLowerCase()}): ${t.notes}`),
      ...analysis.prerequisites.map((p) => `Prerequisite gap: ${p}`),
    ].join('\n');
    const written = await callWriteLesson(
      classTitle,
      entry.module.title,
      entry.lesson.title,
      entry.lesson.objectives,
      excerpt,
      analysisNotes,
      bamlOpts,
    );

    // Canonical body = blocks; markdown is DERIVED for quizzes/search/legacy
    // fallback so the two can never diverge (LESSON-PLAN §4.3).
    results.set(keyOf(entry), {
      title: entry.lesson.title,
      contentMarkdown: flattenBlocksToMarkdown(written.blocks).slice(0, 100_000),
      durationMinutes: clamp(entry.lesson.estimated_minutes, 5, 30, 10),
      blocks: written.blocks,
    });

    completed += 1;
    await appendProgress(
      job,
      `Wrote lesson ${completed}/${allLessons.length}: ${entry.lesson.title}`,
    );
  }

  for (let i = 0; i < allLessons.length; i += LESSON_CONCURRENCY) {
    await Promise.all(allLessons.slice(i, i + LESSON_CONCURRENCY).map(writeOne));
  }

  // Quizzes run per module AFTER its lessons are fully written.
  for (const m of outline.modules) {
    const lessons = m.lessons
      .map((l, li) => results.get(`${m.title}::${li}`))
      .filter((x): x is GeneratedLesson => Boolean(x));
    await appendProgress(job, `Generating quiz: ${m.title}`);
    const quiz = await b.GenerateQuiz(
      m.title,
      lessons.map((l) => l.contentMarkdown),
      bamlOpts,
    );
    modules.push({ title: m.title, lessons, quiz });
  }

  return {
    title: classTitle,
    description: analysis.summary.slice(0, 500),
    modules: modules.map(({ title, lessons, quiz }) => ({
      title,
      lessons,
      ...(quiz ? { quiz: normalizeQuiz(quiz) } : {}),
    })),
  };
}

function keyOf(entry: { module: { title: string }; lessonIndex: number }) {
  return `${entry.module.title}::${entry.lessonIndex}`;
}

function normalizeQuiz(quiz: ModuleQuiz): NonNullable<GeneratedClass['modules'][number]['quiz']> {
  const questions = quiz.questions.slice(0, 5).map((q) => {
    const options = q.options.slice(0, 4);
    while (options.length < 4) options.push('None of the above');
    return {
      question: q.question,
      options,
      correctIndex: clamp(q.correct_index, 0, 3, 0),
    };
  });
  return { title: quiz.title, passingScore: 80, questions };
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// ── Persistence ───────────────────────────────────────────────────────────

async function persistGeneratedClass(gen: GeneratedClass, jobId: string): Promise<string> {
  // Re-validate defensively even though BAML returns typed output — the schema
  // is the contract shared with mock mode and any future pipeline variant.
  const parsed = generatedClassSchema.safeParse(gen);
  if (!parsed.success) throw new Error('Generated class failed validation');

  return prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        title: gen.title,
        description: gen.description ?? null,
        published: false, // always draft until admin confirms
      },
    });

    for (const [mi, mod] of gen.modules.entries()) {
      const createdModule = await tx.module.create({
        data: { classId: cls.id, title: mod.title, order: mi },
      });

      for (const [li, lesson] of mod.lessons.entries()) {
        await tx.lesson.create({ data: lessonData(createdModule.id, lesson, li) });
      }

      if (mod.quiz && mod.quiz.questions.length > 0) {
        const quiz = await tx.quiz.create({
          data: {
            moduleId: createdModule.id,
            title: mod.quiz.title,
            passingScore: mod.quiz.passingScore,
            required: false,
            order: 0,
          },
        });
        for (const [qi, q] of mod.quiz.questions.entries()) {
          await tx.quizQuestion.create({
            data: {
              quizId: quiz.id,
              question: q.question,
              options: toJsonInput(q.options),
              correctIndex: q.correctIndex,
              order: qi,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: null,
        action: 'AI_MASTERCLASS_GENERATED',
        targetType: 'Class',
        targetId: cls.id,
        meta: {
          jobId,
          model: process.env.AI_MODEL ?? 'unknown',
          modules: gen.modules.length,
        } as Prisma.InputJsonValue,
      },
    });

    return cls.id;
  });
}

function lessonData(moduleId: string, lesson: GeneratedLesson, order: number) {
  return {
    moduleId,
    title: lesson.title,
    contentMarkdown: lesson.contentMarkdown,
    blocks: toJsonInput(lesson.blocks),
    videoUrl: null,
    durationMinutes: lesson.durationMinutes,
    order,
  };
}

// ── Regeneration (admin-triggered, single item) ──────────────────────────

/**
 * Regenerate one lesson's body (returns blocks + derived markdown — does NOT
 * save). Prefers the original PDF chunks from the wizard job; falls back to the
 * lesson's current content when the job has expired.
 */
export interface RegeneratedLesson {
  blocks: LessonBlock[];
  contentMarkdown: string;
}

export async function regenerateLesson(
  lessonId: string,
  jobId?: string,
): Promise<RegeneratedLesson> {
  if (process.env.AI_MOCK === '1') {
    const blocks: LessonBlock[] = [
      {
        type: 'prose',
        markdown: `## Why this matters\n\n(mock regenerated) This lesson body was regenerated in mock mode for \`${lessonId}\`.`,
      },
      {
        type: 'inline-check',
        question: '(mock) What should you do after regenerating a lesson?',
        options: ['Publish blindly', 'Review the result', 'Delete it', 'Regenerate again'],
        correctIndex: 1,
        explanation: 'Always review regenerated content before publishing.',
      },
      { type: 'recap', points: ['Point 1', 'Point 2'] },
    ];
    return { blocks, contentMarkdown: flattenBlocksToMarkdown(blocks) };
  }
  const bamlOpts = { clientRegistry: getBamlRegistry() };
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (!lesson) throw AppError.notFound('Lesson not found');

  let courseTitle = 'Reka Bytes course';
  const cls = await prisma.class.findUnique({ where: { id: lesson.module.classId } });
  if (cls) courseTitle = cls.title;

  let objectives: string[] = [`understand ${lesson.title}`];
  let sourceExcerpt = lesson.contentMarkdown; // fallback context
  let analysisNotes = 'No analysis available — expand explanations beyond the existing draft.';

  if (jobId) {
    try {
      const job = await getJob(jobId);
      const outlineLesson = findOutlineLesson(job, lesson.title);
      if (outlineLesson) objectives = outlineLesson.objectives;
      if (job.sourceChunks.length > 0) {
        sourceExcerpt = job.sourceChunks
          .map((c) => `[chunk ${c.index}] ${c.text}`)
          .join('\n\n')
          .slice(0, 24_000);
        analysisNotes = job.reviewNotes.join('\n').slice(0, 4000) || analysisNotes;
      }
    } catch {
      // job expired — keep fallbacks
    }
  }

  const written = await callWriteLesson(
    courseTitle,
    lesson.module.title,
    lesson.title,
    objectives,
    sourceExcerpt,
    analysisNotes,
    bamlOpts,
  );
  return {
    blocks: written.blocks,
    contentMarkdown: flattenBlocksToMarkdown(written.blocks).slice(0, 100_000),
  };
}

function findOutlineLesson(job: AIGenJob, lessonTitle: string): { objectives: string[] } | null {
  // The outline itself isn't stored on the job post-refactor; objectives are
  // recoverable from review notes only loosely, so we regenerate with generic
  // objectives unless the lesson title matches a topic needing expansion.
  const match = job.reviewNotes.find((n) => n.toLowerCase().includes(lessonTitle.toLowerCase()));
  return match ? { objectives: [`understand ${lessonTitle}`, match] } : null;
}

/** Regenerate a module quiz's questions (returns questions — does NOT save). */
export async function regenerateQuizQuestions(
  quizId: string,
): Promise<Array<{ question: string; options: string[]; correctIndex: number }>> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, module: { include: { lessons: true } } },
  });
  if (!quiz) throw AppError.notFound('Quiz not found');

  if (process.env.AI_MOCK === '1') {
    return [
      {
        question: '(mock) Which practice does Reka Bytes emphasize after AI generates code?',
        options: ['Ship blindly', 'Read and understand it', 'Ignore it', 'Delete everything'],
        correctIndex: 1,
      },
    ];
  }

  const bamlOpts = { clientRegistry: getBamlRegistry() };
  // Quiz regen now works from the actual taught content, not just answer keys.
  const lessonContents = quiz.module.lessons
    .sort((a, b) => a.order - b.order)
    .map((l) => l.contentMarkdown);

  const result = await b.GenerateQuiz(quiz.module.title, lessonContents, bamlOpts);
  return normalizeQuiz(result).questions;
}
