import { prisma } from '../lib/prisma';
import { QUESTIONNAIRE_VERSION, AppError } from '@reka-bytes/shared';
import { Prisma } from '@reka-bytes/db';
import { hashPassword } from '@reka-bytes/shared/password';
import type { RegisterInput, SeatsDTO } from '@reka-bytes/shared';
import { ENV_ADMIN_ID } from '../lib/env-admin';
import { countApprovedInCohort, getCurrentCohort } from './cohort.service';

/**
 * Register a new applicant. Race-safe: email check + seat-cap count + create
 * all run inside one interactive transaction.
 * Throws CONFLICT (EMAIL_TAKEN / COHORT_FULL) — mapped by the global handler.
 */
export async function registerApplicant(input: RegisterInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw AppError.conflict('EMAIL_TAKEN', 'This email is already registered.');
    }

    // Applications land in the current cohort; its cap governs registration.
    const cohort = await tx.cohort.findFirst({ where: { isCurrent: true } });
    if (!cohort) {
      throw AppError.conflict(
        'REGISTRATION_CLOSED',
        'Registration is not open right now. Check back soon.',
      );
    }

    const approvedCount = await tx.user.count({
      where: { status: 'APPROVED', role: 'USER', application: { cohortId: cohort.id } },
    });
    if (approvedCount >= cohort.cap) {
      throw AppError.conflict('COHORT_FULL', `${cohort.name} is full. Registration is closed.`);
    }

    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name.trim(),
        passwordHash: hashPassword(input.password),
        role: 'USER',
        status: 'PENDING',
      },
    });

    await tx.application.create({
      data: {
        userId: user.id,
        cohortId: cohort.id,
        schemaVersion: QUESTIONNAIRE_VERSION,
        answers: input.answers as Prisma.InputJsonValue,
      },
    });

    return { id: user.id, status: user.status };
  });
}

/**
 * Approve/reject an application. Approval is race-safe against the cap of
 * the application's own cohort: the count check and status write share one
 * transaction.
 */
export async function decideApplication(opts: {
  applicationId: string;
  decision: 'APPROVED' | 'REJECTED';
  internalNote?: string;
  adminId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: opts.applicationId },
      include: { user: true },
    });
    if (!application) throw AppError.notFound('Application not found');
    if (application.user.status !== 'PENDING') {
      throw AppError.conflict('ALREADY_DECIDED', 'This application has already been decided.');
    }

    if (opts.decision === 'APPROVED') {
      // Legacy rows without a cohort (shouldn't exist post-backfill) skip the cap.
      if (application.cohortId) {
        const cohort = await tx.cohort.findUnique({ where: { id: application.cohortId } });
        if (cohort) {
          const approvedCount = await tx.user.count({
            where: {
              status: 'APPROVED',
              role: 'USER',
              application: { cohortId: cohort.id },
            },
          });
          if (approvedCount >= cohort.cap) {
            throw AppError.conflict(
              'COHORT_FULL',
              `Cannot approve — ${cohort.name} is already full. Raise its cap or open the next cohort.`,
            );
          }
        }
      }
    }

    // Env-based admin has no User row — leave FK columns null, identity in meta
    const isEnvAdmin = opts.adminId === ENV_ADMIN_ID;

    const [user] = await Promise.all([
      tx.user.update({
        where: { id: application.userId },
        data: { status: opts.decision },
      }),
      tx.application.update({
        where: { id: application.id },
        data: {
          internalNote: opts.internalNote ?? null,
          decidedAt: new Date(),
          decidedById: isEnvAdmin ? null : opts.adminId,
        },
      }),
      tx.auditLog.create({
        data: {
          actorId: isEnvAdmin ? null : opts.adminId,
          action: `APPLICATION_${opts.decision}`,
          targetType: 'Application',
          targetId: application.id,
          meta: {
            userId: application.userId,
            note: opts.internalNote ?? null,
            ...(isEnvAdmin ? { actorType: 'env-admin' } : {}),
          },
        },
      }),
    ]);

    return { id: application.id, status: user.status };
  });
}

export async function getSeats(): Promise<SeatsDTO> {
  // Seats are scoped to the current cohort; the landing meter shows its name.
  const cohort = await getCurrentCohort();
  if (!cohort) {
    return { cohort: '', cap: 0, approved: 0, remaining: 0 };
  }
  const approved = await countApprovedInCohort(cohort.id);
  return {
    cohort: cohort.name,
    cap: cohort.cap,
    approved,
    remaining: Math.max(0, cohort.cap - approved),
  };
}
