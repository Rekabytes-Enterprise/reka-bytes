import { z } from 'zod';

// ── Roles & status ──────────────────────────────────────────────
export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
}

export interface ApplicationDTO {
  id: string;
  userId: string;
  schemaVersion: number;
  answers: Record<string, unknown>;
  internalNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    status: UserStatus;
  };
}

export interface SeatsDTO {
  cap: number;
  approved: number;
  remaining: number;
}

export interface AdminStatsDTO extends SeatsDTO {
  pending: number;
  rejected: number;
  totalApplications: number;
}

// ── Admin · Students & Analytics (PRD-03 §3.3–3.4) ──────────────

export interface StudentListItemDTO {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  joinedAt: string;
  lessonsCompleted: number;
  quizAttempts: number;
  avgQuizScore: number | null;
  lastActivityAt: string | null;
}

export interface StudentLessonProgressDTO {
  lessonId: string;
  lessonTitle: string;
  classTitle: string;
  moduleTitle: string;
  completedAt: string;
}

export interface StudentQuizAttemptDTO {
  id: string;
  quizTitle: string;
  moduleTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export interface StudentCheckEventDTO {
  lessonTitle: string;
  blockIndex: number;
  correct: boolean;
  createdAt: string;
}

export interface StudentDetailDTO {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  joinedAt: string;
  lessonsCompleted: number;
  progress: StudentLessonProgressDTO[];
  quizAttempts: StudentQuizAttemptDTO[];
  recentChecks: StudentCheckEventDTO[];
}

export interface AnalyticsClassListItemDTO {
  id: string;
  title: string;
  published: boolean;
  lessonCount: number;
  completionCount: number;
  quizAttempts: number;
  avgQuizScore: number | null;
  passRate: number | null;
}

export interface AnalyticsCheckStatDTO {
  lessonId: string;
  lessonTitle: string;
  blockIndex: number;
  question: string;
  attempts: number;
  correctCount: number;
  /** null when no attempts yet. */
  percentCorrect: number | null;
}

export interface AnalyticsQuizQuestionStatDTO {
  quizId: string;
  quizTitle: string;
  questionId: string;
  question: string;
  attempts: number;
  percentCorrect: number | null;
}

export interface AnalyticsLessonDTO {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  completedCount: number;
  checks: AnalyticsCheckStatDTO[];
}

export interface AnalyticsClassDetailDTO {
  id: string;
  title: string;
  lessons: AnalyticsLessonDTO[];
  quizQuestions: AnalyticsQuizQuestionStatDTO[];
}

// ── Auth payloads ───────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface RegisterResult {
  status: UserStatus;
}
