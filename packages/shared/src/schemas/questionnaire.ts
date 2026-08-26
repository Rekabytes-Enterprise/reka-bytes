import { z } from 'zod';

/**
 * Intake questionnaire — schema-versioned so future cohorts can change
 * questions without a DB migration. Answers are stored as JSON keyed by
 * question id (q1..q12).
 */
export const QUESTION_META: QuestionMeta[] = [
  {
    id: 'q1',
    label: 'Have you used AI tools before?',
    type: 'single',
    required: true,
    options: ['Never', 'Tried a few times', 'Use weekly', 'Use daily'],
  },
  {
    id: 'q2',
    label: 'Which AI models have you used?',
    type: 'multi',
    required: true,
    options: [
      'ChatGPT (GPT-4/o-series)',
      'Claude',
      'Gemini',
      'DeepSeek',
      'Grok',
      'Llama (local)',
      'Other',
    ],
  },
  {
    id: 'q3',
    label: 'What does “vibe coding” mean to you?',
    type: 'text',
    required: true,
    minLength: 20,
    placeholder: 'Describe it in your own words — there is no wrong answer.',
  },
  {
    id: 'q4',
    label: 'Which vibe-coding tools have you tried?',
    type: 'multi',
    required: true,
    options: [
      'Lovable',
      'Bolt.new',
      'Replit Agent',
      'v0',
      'Cursor',
      'Windsurf',
      'Claude Code',
      'Copilot',
      'Cline',
      'None yet',
    ],
  },
  {
    id: 'q5',
    label: 'How comfortable are you reading code (not writing)?',
    type: 'single',
    required: false,
    options: ["Can't read", 'Read a little', 'Comfortable reading', 'Comfortable + small edits'],
  },
  {
    id: 'q6',
    label: 'Do you understand what an API is?',
    type: 'single',
    required: false,
    options: ['No idea', 'Heard of it', 'Understand basics', 'Built one before'],
  },
  {
    id: 'q7',
    label: 'Do you understand databases (tables / rows)?',
    type: 'single',
    required: false,
    options: ['No idea', 'Heard of it', 'Understand basics', 'Used one before'],
  },
  {
    id: 'q8',
    label: 'Do you use Git / GitHub?',
    type: 'single',
    required: false,
    options: ['Never', 'Cloned repos only', 'Commit & push regularly', 'Comfortable with branches & PRs'],
  },
  {
    id: 'q9',
    label: 'Have you deployed anything live (a URL someone else can visit)?',
    type: 'single',
    required: false,
    options: ['Never', 'Yes, via a no-code tool', 'Yes, via CLI or a platform like Vercel/Railway'],
  },
  {
    id: 'q10',
    label: 'Biggest project you have vibe coded so far?',
    type: 'text',
    required: false,
    placeholder: 'A landing page? A SaaS attempt? Nothing yet is fine too.',
  },
  {
    id: 'q11',
    label: 'What do you most want to learn?',
    type: 'multi',
    required: false,
    options: [
      'Architecture basics',
      'Debugging AI code',
      'Databases',
      'APIs',
      'Git & deployment',
      'Prompting better',
      'Security basics',
    ],
  },
  {
    id: 'q12',
    label: 'Time commitment you can make per week?',
    type: 'single',
    required: false,
    options: ['<3 hours', '3–5 hours', '5–10 hours', '>10 hours'],
  },
];

export type QuestionType = 'single' | 'multi' | 'text';

export type QuestionMeta = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  minLength?: number;
  placeholder?: string;
};

/** Build the answers zod schema dynamically from QUESTION_META. */
function buildAnswersSchema() {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of QUESTION_META) {
    if (q.type === 'multi') {
      const base = z.array(z.string());
      shape[q.id] = q.required
        ? base.min(1, 'Pick at least one option')
        : base.default([]);
    } else if (q.type === 'text') {
      let s = z.string();
      if (q.minLength) s = s.min(q.minLength, `Write at least ${q.minLength} characters`);
      shape[q.id] = q.required ? s : s.optional().default('');
    } else {
      const base = z.string();
      shape[q.id] = q.required ? base.min(1, 'This question is required') : base.optional().default('');
    }
  }
  return z.object(shape);
}

export const answersSchema = buildAnswersSchema();
export type Answers = z.infer<typeof answersSchema>;

export const accountSchema = z.object({
  name: z.string().min(2, 'Tell us your name (min 2 characters)'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type AccountInput = z.infer<typeof accountSchema>;

export const registerSchema = z.object({
  ...accountSchema.shape,
  answers: answersSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  internalNote: z.string().max(2000).optional(),
});
export type DecisionInput = z.infer<typeof decisionSchema>;
