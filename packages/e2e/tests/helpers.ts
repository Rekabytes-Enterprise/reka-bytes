import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { pgClient } from './db';

/**
 * E2E helpers deliberately avoid importing the TS workspace packages
 * (@reka-bytes/db / @reka-bytes/shared): Playwright's loader chokes on the
 * Prisma-generated client. Seeding uses raw SQL against the same schema.
 */

export const BACK = process.env.E2E_BACKEND_URL ?? 'http://localhost:4300';
export const FRONT = 'http://localhost:4301';
export const ADMIN = 'http://localhost:4302';

// ── password hashing (must match @reka-bytes/shared/password format) ──
const KEYLEN = 64;
const COST = 16384;

function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N: COST });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

void timingSafeEqual;

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@e2e.rekabytes.test`;
}

/** Minimal valid questionnaire answers keyed by question id. */
export function sampleAnswers(): Record<string, string | string[]> {
  return {
    q1: 'Use weekly',
    q2: ['ChatGPT (GPT-4/o-series)'],
    q3:
      'To me vibe coding means describing what I want to an AI and letting it write the code while I guide it.',
    q4: ['Lovable', 'Cursor'],
  };
}

export interface ApiUser {
  id: string;
  email: string;
  status?: string;
}

export async function registerViaApi(
  email: string,
  password = 'password123',
  name = 'E2E Applicant',
): Promise<{ status: number; body: { data?: ApiUser; error?: { code: string; message: string } } }> {
  const res = await fetch(`${BACK}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, answers: sampleAnswers() }),
  });
  return {
    status: res.status,
    body: (await res.json()) as { data?: ApiUser; error?: { code: string; message: string } },
  };
}

/** Shared login POST → returns the session cookie string. */
async function loginVia(url: string, email: string, password: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email} at ${url}: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('no session cookie returned');
  return setCookie.split(';')[0] ?? '';
}

/** Student/real-DB-user login via the shared login endpoint. */
export async function loginCookie(email: string, password: string): Promise<string> {
  return loginVia(`${BACK}/api/auth/login`, email, password);
}

/**
 * Env-admin session cookie via the DEDICATED admin login endpoint.
 * The shared /api/auth/login no longer accepts env-admin credentials
 * (2026-08 session-leak fix) — admin flows must use this instead.
 */
export async function adminLoginCookie(): Promise<string> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@rekabytes.dev';
  const password = process.env.ADMIN_PASSWORD ?? 'change-me-in-production';
  return loginVia(`${BACK}/api/admin/login`, email, password);
}

export async function approveViaApi(applicationId: string) {
  const cookie = await adminLoginCookie();
  const res = await fetch(`${BACK}/api/admin/applications/${applicationId}/decision`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ decision: 'APPROVED' }),
  });
  return res.status;
}

export async function findApplicationIdByEmail(email: string): Promise<string | null> {
  const cookie = await adminLoginCookie();
  const res = await fetch(`${BACK}/api/admin/applications`, { headers: { Cookie: cookie } });
  const json = (await res.json()) as { data?: Array<{ id: string; user: { email: string } }> };
  return json.data?.find((a) => a.user.email === email)?.id ?? null;
}

/**
 * Ensure exactly `target` approved non-admin users exist by creating filler
 * students directly in the DB. Returns emails created (for cleanup).
 */
export async function fillApprovedSeats(target: number): Promise<string[]> {
  const created: string[] = [];
  const countRes = await pgClient.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "User" WHERE status = 'APPROVED' AND role = 'USER'`,
  );
  const approvedCount = parseInt(countRes.rows[0]?.count ?? '0', 10);
  const missing = Math.max(0, target - approvedCount);

  for (let i = 0; i < missing; i++) {
    const email = uniqueEmail(`filler-${i}`);
    await pgClient.query(
      `INSERT INTO "User" (id, email, "passwordHash", name, role, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'APPROVED', NOW(), NOW())`,
      [randomUUID(), email, hashPassword('password123'), `Filler ${i}`],
    );
    created.push(email);
  }
  return created;
}

export async function cleanupUsers(...emails: string[]) {
  for (const email of emails) {
    await pgClient.query(`DELETE FROM "User" WHERE email = $1`, [email]).catch(() => undefined);
  }
}

// ── Phase 1 classroom seeding (raw SQL — quoted "order", explicit timestamps) ──

export interface SeededClassroom {
  classId: string;
  moduleId: string;
  lessonIds: string[];
  quizId: string;
  questionIds: string[];
  /** correct option index per question, in order */
  correctAnswers: number[];
}

/**
 * Seed one published class: 1 module, 2 lessons (lesson 1 includes a raw
 * <script> snippet + YouTube URL for the XSS/embed assertions), 1 quiz with
 * 2 known-answer questions.
 */
export async function seedClassroom(title = 'E2E Basics'): Promise<SeededClassroom> {
  const ids = {
    classId: randomUUID(),
    moduleId: randomUUID(),
    lessonIds: [randomUUID(), randomUUID()],
    quizId: randomUUID(),
    questionIds: [randomUUID(), randomUUID()],
  };

  await pgClient.query(
    `INSERT INTO "Class" (id, title, description, published, "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 0, NOW(), NOW())`,
    [ids.classId, title, 'Seeded e2e class'],
  );
  await pgClient.query(
    `INSERT INTO "Module" (id, "classId", title, "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 0, NOW(), NOW())`,
    [ids.moduleId, ids.classId, 'Module 1'],
  );

  const lesson1Md = [
    '# Lesson One',
    '',
    'Learn about <script>alert("xss")</script> safely.',
    '',
    '```bash',
    'npm install',
    '```',
  ].join('\n');

  await pgClient.query(
    `INSERT INTO "Lesson" (id, "moduleId", title, "contentMarkdown", "videoUrl", "durationMinutes", "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    [ids.lessonIds[0], ids.moduleId, 'Lesson One', lesson1Md, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 5, 0],
  );
  await pgClient.query(
    `INSERT INTO "Lesson" (id, "moduleId", title, "contentMarkdown", "videoUrl", "durationMinutes", "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), NOW())`,
    [ids.lessonIds[1], ids.moduleId, 'Lesson Two', '## Lesson Two\n\nPlain markdown content.', 10, 1],
  );

  await pgClient.query(
    `INSERT INTO "Quiz" (id, "moduleId", title, "passingScore", required, "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, false, 0, NOW(), NOW())`,
    [ids.quizId, ids.moduleId, 'Module 1 Check', 50],
  );

  const questions = [
    { q: 'Which command installs packages?', options: ['npm install', 'npm dance'], correct: 0 },
    { q: 'Should you read AI-generated code?', options: ['Never', 'Always'], correct: 1 },
  ] as const;

  for (const [i, question] of questions.entries()) {
    await pgClient.query(
      `INSERT INTO "QuizQuestion" (id, "quizId", question, options, "correctIndex", "order")
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [ids.questionIds[i], ids.quizId, question.q, JSON.stringify(question.options), question.correct, i],
    );
  }

  return { ...ids, correctAnswers: questions.map((q) => q.correct) };
}

export async function cleanupClassroom(classId: string) {
  await pgClient.query(`DELETE FROM "Class" WHERE id = $1`, [classId]).catch(() => undefined);
}

/** Register + approve in one shot (API-driven). Self-heals against the seat cap
 * by removing stale e2e-tagged APPROVED users left by earlier runs. */
export async function approveStudent(email: string, password = 'password123'): Promise<void> {
  const attempt = async (): Promise<number> => {
    const { status } = await registerViaApi(email, password);
    return status;
  };

  let status = await attempt();
  if (status === 409) {
    // cohort full of leftovers from prior runs — purge e2e-tagged approved users and retry
    await pgClient.query(
      `DELETE FROM "User" WHERE email LIKE '%@e2e.rekabytes.test' AND status = 'APPROVED'`,
    );
    status = await attempt();
  }
  if (status !== 201) throw new Error(`register failed with ${status}`);

  const appId = await findApplicationIdByEmail(email);
  if (!appId) throw new Error(`no application found for ${email}`);
  const decisionStatus = await approveViaApi(appId);
  if (decisionStatus !== 200) throw new Error(`approve failed with ${decisionStatus}`);
}

// re-export for specs that seed/cleanup directly
export { pgClient } from './db';
