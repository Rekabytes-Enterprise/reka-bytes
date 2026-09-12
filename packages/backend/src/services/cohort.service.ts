import { prisma } from '../lib/prisma';
import { AppError, type CohortDTO } from '@reka-bytes/shared';

/**
 * Cohort administration. A cohort owns its own seat cap; applications are
 * stamped with a cohort at registration and cap checks (register + approve)
 * are scoped to that cohort. Exactly one cohort is `isCurrent` — new
 * registrations land there and the public seats meter reads it.
 */

/** The cohort new applications land in. (For transaction-scoped reads, call prisma directly on tx.) */
export async function getCurrentCohort() {
  return prisma.cohort.findFirst({ where: { isCurrent: true } });
}

/** Approved students whose application belongs to the given cohort. */
export async function countApprovedInCohort(cohortId: string): Promise<number> {
  return prisma.user.count({
    where: { status: 'APPROVED', role: 'USER', application: { cohortId } },
  });
}

export async function listCohorts(): Promise<CohortDTO[]> {
  const [cohorts, apps] = await Promise.all([
    prisma.cohort.findMany({ orderBy: [{ isCurrent: 'desc' }, { createdAt: 'asc' }] }),
    prisma.application.findMany({ select: { cohortId: true, user: { select: { status: true } } } }),
  ]);

  const tally = new Map<string, { pending: number; approved: number; total: number }>();
  for (const a of apps) {
    if (!a.cohortId) continue;
    const t = tally.get(a.cohortId) ?? { pending: 0, approved: 0, total: 0 };
    t.total += 1;
    if (a.user.status === 'PENDING') t.pending += 1;
    if (a.user.status === 'APPROVED') t.approved += 1;
    tally.set(a.cohortId, t);
  }

  return cohorts.map((c) => ({
    id: c.id,
    name: c.name,
    cap: c.cap,
    isCurrent: c.isCurrent,
    approved: tally.get(c.id)?.approved ?? 0,
    pending: tally.get(c.id)?.pending ?? 0,
    applications: tally.get(c.id)?.total ?? 0,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function createCohort(input: { name: string; cap: number }): Promise<CohortDTO> {
  const name = input.name.trim();
  const existing = await prisma.cohort.findUnique({ where: { name } });
  if (existing) {
    throw AppError.conflict('COHORT_NAME_TAKEN', `A cohort named "${name}" already exists.`);
  }

  const cohort = await prisma.cohort.create({
    data: { name, cap: input.cap },
  });
  // Shape matches listCohorts — a fresh cohort has no applications yet.
  return {
    id: cohort.id,
    name: cohort.name,
    cap: cohort.cap,
    isCurrent: cohort.isCurrent,
    approved: 0,
    pending: 0,
    applications: 0,
    createdAt: cohort.createdAt.toISOString(),
  };
}

export async function updateCohort(
  id: string,
  input: { name?: string; cap?: number },
): Promise<CohortDTO> {
  const cohort = await prisma.cohort.findUnique({ where: { id } });
  if (!cohort) throw AppError.notFound('Cohort not found');

  if (input.name !== undefined && input.name.trim() !== cohort.name) {
    const name = input.name.trim();
    const taken = await prisma.cohort.findUnique({ where: { name } });
    if (taken) {
      throw AppError.conflict('COHORT_NAME_TAKEN', `A cohort named "${name}" already exists.`);
    }
    cohort.name = name;
  }
  if (input.cap !== undefined) cohort.cap = input.cap;

  const updated = await prisma.cohort.update({
    where: { id },
    data: { name: cohort.name, cap: cohort.cap },
  });
  return (await listCohorts()).find((c) => c.id === updated.id) as CohortDTO;
}

/** Move the "current" flag: new registrations land in this cohort. */
export async function activateCohort(id: string): Promise<CohortDTO> {
  const cohort = await prisma.cohort.findUnique({ where: { id } });
  if (!cohort) throw AppError.notFound('Cohort not found');

  await prisma.$transaction([
    prisma.cohort.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
    prisma.cohort.update({ where: { id }, data: { isCurrent: true } }),
  ]);

  return (await listCohorts()).find((c) => c.id === id) as CohortDTO;
}
