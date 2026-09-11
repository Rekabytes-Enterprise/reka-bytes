/**
 * Phase 1 content DTOs (PRD-02 §4 / §10). All dates ISO strings.
 * SECURITY: student-facing DTOs never carry `correctIndex`.
 */

import type { StudentLessonBlock } from './blocks';
import type { GameProfileDTO } from './game/profile';

// ── Admin side ──────────────────────────────────────────────────
export interface ClassSummaryDTO {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  published: boolean;
  order: number;
  moduleCount: number;
  lessonCount: number;
  quizCount: number;
  createdAt: string;
}

export interface QuestionAdminDTO {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  order: number;
}

export interface QuizAdminDTO {
  id: string;
  moduleId: string;
  title: string;
  passingScore: number;
  required: boolean;
  questions: QuestionAdminDTO[];
}

export interface LessonDTO {
  id: string;
  moduleId: string;
  title: string;
  contentMarkdown: string;
  /** Admin sees FULL blocks incl. inline-check answers. */
  blocks: import('./blocks').LessonBlock[] | null;
  videoUrl: string | null;
  durationMinutes: number;
  order: number;
}

export interface ModuleTreeDTO {
  id: string;
  classId: string;
  title: string;
  order: number;
  lessons: LessonDTO[];
  quiz: QuizAdminDTO | null;
}

export interface ClassTreeDTO {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  published: boolean;
  order: number;
  modules: ModuleTreeDTO[];
}

// ── Student side ────────────────────────────────────────────────
export interface StudentLessonSummaryDTO {
  id: string;
  title: string;
  durationMinutes: number;
  order: number;
  completedAt: string | null;
}

export interface StudentQuizSummaryDTO {
  id: string;
  title: string;
  passingScore: number;
  required: boolean;
  questionCount: number;
}

export interface StudentModuleDTO {
  id: string;
  title: string;
  order: number;
  lessons: StudentLessonSummaryDTO[];
  quiz: StudentQuizSummaryDTO | null;
}

export interface StudentClassDTO {
  id: string;
  title: string;
  description: string | null;
  modules: StudentModuleDTO[];
}

export interface LessonDetailDTO {
  id: string;
  title: string;
  contentMarkdown: string;
  /**
   * Canonical typed body (LESSON-PLAN §4), sanitized for students
   * (no inline-check answers). Null/empty → render contentMarkdown fallback.
   */
  blocks: StudentLessonBlock[] | null;
  videoUrl: string | null;
  durationMinutes: number;
  classId: string;
  classTitle: string;
  moduleId: string;
  moduleTitle: string;
  prevLessonId: string | null;
  nextLessonId: string | null;
  completedAt: string | null;
  quiz: StudentQuizSummaryDTO | null;
}

/** Quiz as the student sees it before submitting — no correct answers. */
export interface PublicQuestionDTO {
  id: string;
  question: string;
  options: string[];
}

export interface PublicQuizDTO {
  id: string;
  title: string;
  passingScore: number;
  required: boolean;
  questions: PublicQuestionDTO[];
}

export interface QuestionResultDTO {
  questionId: string;
  question: string;
  correct: boolean;
  userAnswer: number;
  correctAnswer: number;
  options: string[];
}

export interface QuizSubmitResultDTO {
  score: number;
  passed: boolean;
  attemptId: string;
  results: QuestionResultDTO[];
}

export interface QuizAttemptDTO {
  id: string;
  quizId: string;
  quizTitle: string;
  moduleTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export type NextLessonDTO = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  durationMinutes: number;
};

export interface LearnDashboardDTO {
  totalLessons: number;
  completedLessons: number;
  nextLesson: NextLessonDTO | null;
  recentAttempts: QuizAttemptDTO[];
  /** Average score across every quiz attempt for the user (null when none). */
  quizAvgScore: number | null;
  /** Gamification layer (PRD-04 §4) — XP levels, streaks, badge catalog state. */
  game: GameProfileDTO;
}

// ── AI Masterclass ──────────────────────────────────────────────
/** `awaiting_approval` = outline checkpoint: pipeline paused for admin sign-off. */
export type AIGenJobStatus = 'processing' | 'awaiting_approval' | 'done' | 'error';

export interface AIOutlineLessonDTO {
  title: string;
  objectives: string[];
  estimatedMinutes: number;
}

export interface AIOutlineModuleDTO {
  title: string;
  description: string;
  lessons: AIOutlineLessonDTO[];
}

export interface AIOutlineDTO {
  modules: AIOutlineModuleDTO[];
}

export interface AIAnalysisTopicDTO {
  title: string;
  coverage: 'EXPLAINED' | 'PARTIAL' | 'MENTIONED';
  needsExpansion: boolean;
  notes: string;
}

/** Structured output of the AnalyzeDocument pass (drives AnalysisPanel UI). */
export interface AIAnalysisDTO {
  summary: string;
  topics: AIAnalysisTopicDTO[];
  prerequisites: string[];
  warnings: string[];
}

export interface AIGenJobStatusDTO {
  jobId: string;
  status: AIGenJobStatus;
  progress: string[];
  classId: string | null;
  error: string | null;
  /** Findings from the AnalyzeDocument pass (topics, gaps, warnings). */
  reviewNotes: string[];
  /** Same findings, structured — rendered by the wizard's AnalysisPanel. */
  analysis: AIAnalysisDTO | null;
  /** Proposed outline — present while the job is awaiting approval. */
  outline: AIOutlineDTO | null;
}
