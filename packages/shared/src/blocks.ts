import { z } from 'zod';

/**
 * Interactive Lesson Engine — block model (LESSON-PLAN.md §4).
 *
 * A lesson body is an ordered array of typed blocks. This discriminated union
 * is the single source of truth for: BAML output mapping, DB validation,
 * frontend rendering and admin editing.
 *
 * SECURITY (Container Rule): renderers only ever read fields validated here;
 * free-form HTML exists only inside the `widget` block, which must be rendered
 * in a sandboxed iframe with no same-origin access (Phase C).
 *
 * SECURITY (answer leakage): inline-check `correctIndex`/`explanation` are
 * stripped server-side before any student DTO leaves the API (§8.2).
 */

// ── Individual block schemas ────────────────────────────────────

export const proseBlockSchema = z.object({
  type: z.literal('prose'),
  markdown: z.string().min(1).max(50_000),
});

export const calloutBlockSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['info', 'warning', 'mistake', 'tip']),
  title: z.string().min(1).max(200),
  markdown: z.string().min(1).max(20_000),
});

export const keyTermsBlockSchema = z.object({
  type: z.literal('key-terms'),
  terms: z
    .array(
      z.object({
        term: z.string().min(1).max(100),
        definition: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30),
});

export const comparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  headers: z.tuple([z.string().min(1).max(200), z.string().min(1).max(200)]),
  rows: z
    .array(z.tuple([z.string().min(1).max(1000), z.string().min(1).max(1000)]))
    .min(1)
    .max(40),
});

export const mermaidBlockSchema = z.object({
  type: z.literal('mermaid'),
  source: z.string().min(1).max(20_000),
  caption: z.string().min(1).max(300).optional(),
});

export const stepsBlockSchema = z.object({
  type: z.literal('steps'),
  title: z.string().min(1).max(200),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        markdown: z.string().min(1).max(10_000),
      }),
    )
    .min(1)
    .max(20),
});

export const inlineCheckBlockSchema = z
  .object({
    type: z.literal('inline-check'),
    question: z.string().min(3).max(500),
    options: z.array(z.string().min(1).max(300)).min(2).max(8),
    correctIndex: z.number().int().min(0),
    explanation: z.string().min(1).max(2000),
  })
  .superRefine((val, ctx) => {
    if (val.correctIndex >= val.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctIndex'],
        message: 'correctIndex must point at one of the options',
      });
    }
  });

/** Guided try-it with progressive hint reveal (Phase B shells degrade to this). */
export const exerciseBlockSchema = z.object({
  type: z.literal('exercise'),
  prompt: z.string().min(1).max(2000),
  starter: z.string().max(20_000).optional(),
  solution: z.string().min(1).max(20_000),
  hints: z.array(z.string().min(1).max(1000)).max(5),
});

/** Simulation shells (Phase B). Scenario payload is strict per-kind there. */
export const simKindSchema = z.enum([
  'terminal-sim',
  'prompt-builder',
  'debug-scenario',
  'order-steps',
  'match-pairs',
  'predict-output',
]);
export const simulationBlockSchema = z.object({
  type: z.literal('simulation'),
  sim: simKindSchema,
  /** Phase B gives each kind its own schema; until then opaque-but-validated JSON. */
  scenario: z.record(z.string(), z.unknown()),
});

/**
 * Sandboxed AI-authored widget (Phase C). `html` is a COMPLETE self-contained
 * document rendered only via `<iframe sandbox="allow-scripts">` — never
 * injected into our DOM. Static server checks + mandatory admin review gate it.
 */
export const widgetBlockSchema = z.object({
  type: z.literal('widget'),
  title: z.string().min(1).max(200),
  /** Complete self-contained document: inline CSS/JS, data: URIs, no external requests.
   *  Server injects a CSP <meta> + height reporter at generation time (PRD-06 §6). */
  html: z.string().min(1).max(200_000),
  /** Learner-facing one-liner: what to try with the scene. */
  brief: z.string().min(1).max(500),
  /** What to show when the scene can't run: no-JS, unreviewed, oversized, error. */
  fallbackMarkdown: z.string().min(1).max(20_000),
  /** Server-forced false at generation; admin acknowledge via lesson editor is
   *  the only writer of true. Unreviewed scenes never render to students. */
  reviewed: z.boolean().default(false),
});

export const recapBlockSchema = z.object({
  type: z.literal('recap'),
  points: z.array(z.string().min(1).max(500)).min(1).max(15),
});

// ── The union ───────────────────────────────────────────────────

export const lessonBlockSchema = z.discriminatedUnion('type', [
  proseBlockSchema,
  calloutBlockSchema,
  keyTermsBlockSchema,
  comparisonBlockSchema,
  mermaidBlockSchema,
  stepsBlockSchema,
  inlineCheckBlockSchema,
  exerciseBlockSchema,
  simulationBlockSchema,
  widgetBlockSchema,
  recapBlockSchema,
]);

export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export type ProseBlock = z.infer<typeof proseBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;
export type CalloutVariant = z.infer<typeof calloutBlockSchema>['variant'];
export type KeyTermsBlock = z.infer<typeof keyTermsBlockSchema>;
export type ComparisonBlock = z.infer<typeof comparisonBlockSchema>;
export type MermaidBlock = z.infer<typeof mermaidBlockSchema>;
export type StepsBlock = z.infer<typeof stepsBlockSchema>;
export type InlineCheckBlock = z.infer<typeof inlineCheckBlockSchema>;
export type ExerciseBlock = z.infer<typeof exerciseBlockSchema>;
export type SimKind = z.infer<typeof simKindSchema>;
export type WidgetBlock = z.infer<typeof widgetBlockSchema>;
export type RecapBlock = z.infer<typeof recapBlockSchema>;

export const blocksSchema = z.array(lessonBlockSchema);
export type LessonBlocks = z.infer<typeof blocksSchema>;

// ── Student-facing (sanitized) view ──────────────────────────────
/**
 * Inline checks lose `correctIndex` AND `explanation` before reaching the
 * student client — explanations typically state the answer. Grading happens
 * server-side via POST /api/learn/lessons/:id/check.
 */
type WithoutAnswers<T> = T extends { type: 'inline-check' }
  ? Omit<T, 'correctIndex' | 'explanation'>
  : T;

export type StudentLessonBlock = WithoutAnswers<LessonBlock>;
export type StudentInlineCheckBlock = Omit<
  z.infer<typeof inlineCheckBlockSchema>,
  'correctIndex' | 'explanation'
>;

const studentInlineCheckSchema = z.object({
  type: z.literal('inline-check'),
  question: z.string().min(3).max(500),
  options: z.array(z.string().min(1).max(300)).min(2).max(8),
});

export function sanitizeBlocksForStudent(blocks: LessonBlock[]): StudentLessonBlock[] {
  return blocks.map((block): StudentLessonBlock => {
    if (block.type === 'inline-check') {
      const { question, options } = studentInlineCheckSchema.parse(block);
      return { type: 'inline-check', question, options };
    }
    return block as StudentLessonBlock;
  });
}

// ── Parsing helpers ─────────────────────────────────────────────

/** Parse one raw block (e.g. from BAML output or DB Json). Null if invalid. */
export function parseBlock(raw: unknown): LessonBlock | null {
  const result = lessonBlockSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Parse an unknown array into valid blocks, silently dropping invalid ones.
 * A lesson never fails because one block came back malformed.
 */
export function parseBlocks(raw: unknown): LessonBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseBlock).filter((b): b is LessonBlock => b !== null);
}

// ── Flattening (markdown fallback / search / quiz input) ────────

/**
 * Convert blocks back to one markdown string. Used for:
 * - legacy `contentMarkdown` kept alongside `blocks` (renderer fallback)
 * - quiz generation input
 */
export function flattenBlocksToMarkdown(blocks: LessonBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'prose':
        parts.push(block.markdown);
        break;
      case 'callout':
        parts.push(`> **${block.title}**\n>\n${indentQuote(block.markdown)}`);
        break;
      case 'key-terms':
        parts.push(
          [
            '**Key terms**',
            '',
            ...block.terms.map((t) => `- **${t.term}** — ${t.definition}`),
          ].join('\n'),
        );
        break;
      case 'comparison': {
        const lines = [
          `| ${block.headers[0]} | ${block.headers[1]} |`,
          '| --- | --- |',
          ...block.rows.map(([a, b]) => `| ${a} | ${b} |`),
        ];
        parts.push(lines.join('\n'));
        break;
      }
      case 'mermaid':
        parts.push(['```mermaid', block.source, '```'].join('\n'));
        break;
      case 'steps':
        parts.push(
          [
            `## ${block.title}`,
            '',
            ...block.steps.map((s, i) => `${i + 1}. **${s.title}**\n\n${indentList(s.markdown)}`),
          ].join('\n'),
        );
        break;
      case 'inline-check':
        parts.push(
          [
            `**Check:** ${block.question}`,
            '',
            ...block.options.map((o, i) => `- ${o}${i === block.correctIndex ? ' ✓' : ''}`),
            '',
            `Answer: ${block.options[block.correctIndex]} — ${block.explanation}`,
          ].join('\n'),
        );
        break;
      case 'exercise':
        parts.push([`**Try it:** ${block.prompt}`, '', '```', block.solution, '```'].join('\n'));
        break;
      case 'simulation':
        parts.push(`_[interactive exercise: ${block.sim}]_`);
        break;
      case 'widget':
        parts.push(
          [
            `### ${block.title}`,
            '',
            block.brief,
            '',
            '> _This is a hands-on interactive section — it comes alive in the lesson viewer._',
            '',
            block.fallbackMarkdown,
          ].join('\n'),
        );
        break;
      case 'recap':
        parts.push(['## Recap', '', ...block.points.map((p) => `- ${p}`)].join('\n'));
        break;
    }
  }

  return parts.join('\n\n');
}

function indentQuote(md: string): string {
  return md
    .split('\n')
    .map((l) => (l.trim() ? `> ${l}` : '>'))
    .join('\n');
}

function indentList(md: string): string {
  return md
    .split('\n')
    .map((l) => `   ${l}`)
    .join('\n');
}
