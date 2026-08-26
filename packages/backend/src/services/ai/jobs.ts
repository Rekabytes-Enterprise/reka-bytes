import { randomUUID } from 'node:crypto';
import { redis } from '../../lib/redis';
import { AppError } from '@reka-bytes/shared';
import type { AIGenJobStatusDTO, AIGenJobStatus, AIOutlineDTO, AIAnalysisDTO } from '@reka-bytes/shared';
import type { ClassOutline, DocumentAnalysis } from '@reka-bytes/baml';

/**
 * Redis-backed AI generation jobs (PRD-02 §5.8).
 * Key: rb:aigen:{jobId} · JSON payload · TTL 2 h.
 *
 * The pipeline PAUSES at the outline checkpoint: after AnalyzeDocument +
 * GenerateOutline the job flips to `awaiting_approval` and waits for the
 * admin to approve (or regenerate) the outline before lesson writing starts.
 * TTL is 2 h because a human — not a poller — controls the wait.
 *
 * The payload also carries pipeline internals (reviewNotes for the wizard's
 * AI-notes panel, sourceChunks so lesson/quiz regen can cite the original
 * PDF, analysis + outline so resume continues without re-paying pass 1–2).
 * Internals never leave the backend except reviewNotes, analysis and the outline DTO.
 */

const KEY_PREFIX = 'rb:aigen:';
const TTL_SECONDS = 60 * 60 * 2;

export interface AIGenJob {
  jobId: string;
  status: AIGenJobStatus;
  progress: string[];
  classId: string | null;
  error: string | null;
  /** Class title chosen in step 1 — needed by resume after the checkpoint. */
  classTitle: string;
  /** Uploaded PDF path — kept until resume persists, then deleted. */
  uploadPath: string | null;
  /** Human-readable findings from the AnalyzeDocument pass. */
  reviewNotes: string[];
  /** Numbered source chunks — kept for regen endpoints while the job lives. */
  sourceChunks: Array<{ index: number; text: string }>;
  /** Pass-1 output — stored so resume skips straight to lesson writing. */
  analysis: DocumentAnalysis | null;
  /** Pass-2 output — the checkpoint artifact the admin approves. */
  outline: ClassOutline | null;
}

function key(jobId: string) {
  return `${KEY_PREFIX}${jobId}`;
}

async function write(job: AIGenJob) {
  await redis.set(key(job.jobId), JSON.stringify(job), 'EX', TTL_SECONDS);
}

export function createJob(classTitle: string, uploadPath: string | null): AIGenJob {
  return {
    jobId: randomUUID(),
    status: 'processing',
    progress: [],
    classId: null,
    error: null,
    classTitle,
    uploadPath,
    reviewNotes: [],
    sourceChunks: [],
    analysis: null,
    outline: null,
  };
}

export async function appendProgress(job: AIGenJob, message: string) {
  job.progress.push(message);
  await write(job);
}

/** Replace the job's review notes (called once after the analysis pass). */
export async function setReviewNotes(job: AIGenJob, notes: string[]) {
  job.reviewNotes = notes;
  await write(job);
}

/** Persist any mutated job fields (analysis/outline assignment etc.). */
export async function saveJob(job: AIGenJob) {
  await write(job);
}

/** Checkpoint: stop before lesson writing until the admin approves. */
export async function pauseForApproval(job: AIGenJob) {
  job.status = 'awaiting_approval';
  await write(job);
}

export async function completeJob(job: AIGenJob, classId: string) {
  job.status = 'done';
  job.classId = classId;
  // Chunks are only needed until the class is confirmed; free the memory.
  job.sourceChunks = [];
  await write(job);
}

export async function failJob(job: AIGenJob, message: string) {
  job.status = 'error';
  job.error = message;
  await write(job);
}

export async function getJob(jobId: string): Promise<AIGenJob> {
  const raw = await redis.get(key(jobId));
  if (!raw) throw AppError.notFound('Generation job not found (expired or unknown)');
  return JSON.parse(raw) as AIGenJob;
}

function outlineToDTO(outline: ClassOutline): AIOutlineDTO {
  return {
    modules: outline.modules.map((m) => ({
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        objectives: l.objectives,
        estimatedMinutes: l.estimated_minutes,
      })),
    })),
  };
}

function analysisToDTO(analysis: DocumentAnalysis): AIAnalysisDTO {
  return {
    summary: analysis.summary,
    topics: analysis.topics.map((t) => ({
      title: t.title,
      coverage: t.coverage,
      needsExpansion: t.needs_expansion,
      notes: t.notes,
    })),
    prerequisites: analysis.prerequisites,
    warnings: analysis.warnings,
  };
}

/** Public shape for GET /status/:jobId — internals stripped. */
export function toStatusDTO(job: AIGenJob): AIGenJobStatusDTO {
  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    classId: job.classId,
    error: job.error,
    reviewNotes: job.reviewNotes,
    analysis: job.analysis ? analysisToDTO(job.analysis) : null,
    outline: job.outline ? outlineToDTO(job.outline) : null,
  };
}
