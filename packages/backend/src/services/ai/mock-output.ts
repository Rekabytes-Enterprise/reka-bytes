import { flattenBlocksToMarkdown } from '@reka-bytes/shared';
import type { GeneratedClass, LessonBlock } from '@reka-bytes/shared';
import { hardenSceneBlocks } from '../scene-hardening';

/** Review notes shown in the wizard while AI_MOCK=1 (deterministic). */
export function mockReviewNotes(): string[] {
  return [
    'Fixture analysis: a short onboarding document covering tool setup and first steps.',
    'Tool setup — thorough: source explains installation clearly.',
    'Reading AI-generated code — partial: mentioned but under-explained; lessons must expand this.',
    'Shipping workflow — mentioned: only name-dropped; folded into Module 2 with expansion.',
    'Assumes but does not teach: basic terminal usage; flagged as prerequisite.',
  ];
}

/**
 * Fixture blocks for the first mock lesson — exercises every Phase A renderer:
 * prose, callout(mistake), key-terms, steps, MERMAID (flowchart), TWO
 * inline-checks, ONE widget scene (PRD-06 R2: mock must exercise the same
 * hardening the real path gets) and recap. Must satisfy blocksSchema exactly
 * (it flows through generatedClassSchema.safeParse like real pipeline output).
 */
function mockLesson1Blocks(): LessonBlock[] {
  const blocks: LessonBlock[] = [
    {
      type: 'prose',
      markdown:
        '## Why this matters\n\nEvery developer you admire started exactly where you are: staring at a blank editor. The difference is not talent — it is knowing how to **direct AI tools** and read what they produce.',
    },
    {
      type: 'key-terms',
      terms: [
        {
          term: 'Vibe coding',
          definition:
            'Building software by describing what you want in plain language, then reviewing what the AI writes.',
        },
        {
          term: 'Terminal',
          definition: 'A text interface for running commands directly on your computer.',
        },
      ],
    },
    {
      type: 'prose',
      markdown:
        '## The concept\n\n**Vibe coding** means building software by describing what you want in plain language, then reviewing and refining what the AI writes. You stay the architect; the AI is your fast, sometimes-wrong assistant.\n\nThe workflow always looks like this:',
    },
    {
      type: 'mermaid',
      source:
        'graph LR\n  A[You describe] --> B[AI generates]\n  B --> C[You review]\n  C --> D{Good enough?}\n  D -- yes --> E[Ship it]\n  D -- no --> B',
      caption: 'The vibe-coding loop: direct, read, refine.',
    },
    {
      type: 'inline-check',
      question: 'In vibe coding, who is responsible for verifying that generated code is correct?',
      options: ['The AI tool', 'Nobody — trust it', 'You, the developer', 'The code editor'],
      correctIndex: 2,
      explanation:
        'AI is your fast, sometimes-wrong assistant — you stay the architect and always verify.',
    },
    {
      type: 'steps',
      title: 'Walkthrough: create your first project',
      steps: [
        {
          title: 'Run the scaffold command',
          markdown:
            '```bash\nnpx create-next-app@latest my-app\n# npx → runs a tool without installing it globally\n# @latest → use the newest version\n```',
        },
        {
          title: 'Read the output',
          markdown: 'The command prints each step it takes. Never skip reading it.',
        },
      ],
    },
    {
      type: 'callout',
      variant: 'mistake',
      title: 'Common mistakes',
      markdown:
        '- Running commands without reading them — always ask "what will this do?"\n- Accepting AI code you cannot explain. If you cannot explain it, ask the AI to teach it first.',
    },
    {
      type: 'inline-check',
      question: 'What does `@latest` do in `npx create-next-app@latest my-app`?',
      options: [
        'Installs the newest version of the tool',
        'Creates a folder named latest',
        'Locks the project version forever',
        'Updates your operating system',
      ],
      correctIndex: 0,
      explanation:
        '`@latest` tells npx to fetch the newest version of the scaffolding tool before running it.',
    },
    {
      type: 'widget',
      title: 'The vibe-coding loop',
      brief: 'Click each stage to walk the loop, then run a full cycle yourself.',
      html: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #FAFAF7; color: #14161A; }
  .loop { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
  .step { flex: 1 1 90px; border: 2px solid #E3E5DE; border-radius: 10px; padding: 12px 8px; text-align: center; cursor: pointer; transition: border-color .2s, background .2s; }
  .step.active { border-color: #4E7700; background: #F0F1EC; }
  .step strong { display: block; font-size: 13px; }
  .step span { font-size: 11px; color: #565E66; }
  .bar { height: 6px; background: #E3E5DE; border-radius: 3px; overflow: hidden; margin-top: 10px; }
  .bar i { display: block; height: 100%; width: 0%; background: #4E7700; transition: width .3s; }
  button.run { margin-top: 10px; width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #4E7700; color: #fff; font-weight: 700; cursor: pointer; }
  button.run:focus-visible { outline: 2px solid #14161A; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
  <p style="margin: 4px 0 0; font-size: 12px; color: #565E66;">Click a stage — or run a full cycle:</p>
  <div class="loop">
    <div class="step" data-i="0"><strong>1 · Direct</strong><span>you tell the AI what to build</span></div>
    <div class="step" data-i="1"><strong>2 · Watch</strong><span>AI writes the code</span></div>
    <div class="step" data-i="2"><strong>3 · Verify</strong><span>you read + test the result</span></div>
  </div>
  <div class="bar"><i id="fill"></i></div>
  <button class="run" id="run">Run a full cycle</button>
  <p id="status" style="font-size: 12px; color: #565E66; margin: 10px 0 0;">Cycles completed: 0</p>
<script>
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var fill = document.getElementById('fill');
  var status = document.getElementById('status');
  var active = -1, cycles = 0, timer = null;
  function setActive(i) {
    active = i;
    steps.forEach(function (s, j) { s.classList.toggle('active', j === i); });
    fill.style.width = (((active + 1) / 3) * 100) + '%';
  }
  steps.forEach(function (s) {
    s.addEventListener('click', function () { setActive(Number(s.getAttribute('data-i'))); });
  });
  document.getElementById('run').addEventListener('click', function () {
    if (timer) return;
    var i = 0;
    timer = setInterval(function () {
      if (i > 2) {
        clearInterval(timer); timer = null;
        cycles += 1; status.textContent = 'Cycles completed: ' + cycles;
        return;
      }
      setActive(i); i += 1;
    }, 700);
  });
  setActive(0);
</script>
</body>
</html>`,
      fallbackMarkdown:
        'The loop has three stages: **Direct** (tell the AI what to build), **Watch** (it writes the code), **Verify** (you read and test the result). Each pass through the loop is one cycle — the skill is running many small cycles, not one big one.',
      reviewed: false,
    },
    {
      type: 'recap',
      points: [
        'Vibe coding = you direct, AI types, you verify',
        'Reading generated code is the core skill of this course',
      ],
    },
  ];
  // The mock bypasses toLessonBlocks, so it hardens its own scene here —
  // CSP <meta> + height reporter injected exactly like the real pipeline.
  return hardenSceneBlocks(blocks);
}

/** Simple typed body for secondary mock lessons. */
function mockSimpleBlocks(intro: string): LessonBlock[] {
  return [
    { type: 'prose', markdown: intro },
    {
      type: 'inline-check',
      question: '(mock) Ready to move on?',
      options: ['Yes', 'Not yet'],
      correctIndex: 0,
      explanation: 'Take your time — the next lesson builds on this one.',
    },
  ];
}
/**
 * Deterministic fixture for AI_MOCK=1 (PRD-02 §9 / e2e E2E-13).
 * Same shape the real pipeline produces — still goes through zod validation
 * and the same Prisma transaction, so the whole pipeline is exercised.
 */
export function mockGeneratedClass(classTitle: string): GeneratedClass {
  return {
    title: classTitle,
    description: `AI Masterclass (mock) — generated for ${classTitle}.`,
    modules: [
      {
        title: 'Module 1: Getting Started',
        lessons: [
          {
            title: 'Welcome to Reka Bytes',
            blocks: mockLesson1Blocks(),
            contentMarkdown: flattenBlocksToMarkdown(mockLesson1Blocks()),
            durationMinutes: 10,
          },
          {
            title: 'Your Dev Setup',
            blocks: mockSimpleBlocks(
              '## Dev Setup\n\nInstall your editor and make sure Node runs. If `node --version` prints a version number, you are ready. AI tools work best when your environment is boring and predictable.',
            ),
            contentMarkdown:
              '## Dev Setup\n\nInstall your editor and make sure Node runs.\n\n```bash\nnode --version\n```\n\nIf the version prints, you are ready. AI tools work best when your environment is boring and predictable.',
            durationMinutes: 15,
          },
        ],
        quiz: {
          title: 'Module 1 Check',
          passingScore: 80,
          questions: [
            {
              question: 'Which command creates a new Next.js app in this course?',
              options: [
                'npx create-next-app@latest my-app',
                'npm install next-only',
                'node make-app',
                'yarn brew next',
              ],
              correctIndex: 0,
            },
            {
              question: 'What does the course say AI tools need from your environment?',
              options: [
                'A GPU farm',
                'A boring, predictable setup',
                'A paid subscription',
                'Docker swarm',
              ],
              correctIndex: 1,
            },
            {
              question: 'What is the goal of Reka Bytes?',
              options: [
                'Replace engineers with AI',
                'Learn to vibe code properly with fundamentals',
                'Memorize syntax',
                'Avoid using AI tools',
              ],
              correctIndex: 1,
            },
          ],
        },
      },
      {
        title: 'Module 2: First Project',
        lessons: [
          {
            title: 'Hello, Vibe Coder',
            blocks: mockSimpleBlocks(
              '## Your first prompt\n\nOpen your AI editor and ask for a landing page. Then **read what it generated**. Understanding beats copying — that is the whole philosophy of this academy.',
            ),
            contentMarkdown:
              '## Your first prompt\n\nOpen your AI editor and ask for a landing page. Then **read what it generated**.\n\nUnderstanding beats copying — that is the whole philosophy of this academy.',
            durationMinutes: 15,
          },
        ],
        quiz: {
          title: 'Module 2 Check',
          passingScore: 80,
          questions: [
            {
              question: 'What should you do right after AI generates code?',
              options: [
                'Ship immediately',
                'Read and understand it',
                'Delete it',
                'Ask another AI',
              ],
              correctIndex: 1,
            },
          ],
        },
      },
    ],
  };
}
