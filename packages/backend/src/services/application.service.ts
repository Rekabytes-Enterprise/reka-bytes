import { prisma } from '../lib/prisma';
import { COHORT_CAP, QUESTIONNAIRE_VERSION, AppError } from '@reka-bytes/shared';
import { Prisma } from '@reka-bytes/db';
import { hashPassword } from '@reka-bytes/shared/password';
import type { RegisterInput } from '@reka-bytes/shared';
import { ENV_ADMIN_ID } from '../lib/env-admin';

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

    const approvedCount = await tx.user.count({ where: { status: 'APPROVED', role: 'USER' } });
    if (approvedCount >= COHORT_CAP) {
      throw AppError.conflict('COHORT_FULL', 'Cohort 001 is full. Registration is closed.');
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
        schemaVersion: QUESTIONNAIRE_VERSION,
        answers: input.answers as Prisma.InputJsonValue,
      },
    });

    return { id: user.id, status: user.status };
  });
}

/**
 * Approve/reject an application. Approval is race-safe against the cap:
 * the count check and status write share one transaction.
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
      const approvedCount = await tx.user.count({ where: { status: 'APPROVED', role: 'USER' } });
      if (approvedCount >= COHORT_CAP) {
        throw AppError.conflict('COHORT_FULL', 'Cannot approve — the cohort is already full.');
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

export async function getSeats() {
  const approved = await prisma.user.count({ where: { status: 'APPROVED', role: 'USER' } });
  return {
    cap: COHORT_CAP,
    approved,
    remaining: Math.max(0, COHORT_CAP - approved),
  };
}
