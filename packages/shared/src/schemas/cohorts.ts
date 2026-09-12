import { z } from 'zod';

/**
 * Cohort administration (dynamic cohort capacity). A cohort owns its own
 * seat cap; applications are stamped with a cohort at registration and the
 * approve/reject cap checks are scoped to the application's cohort.
 */
export const cohortCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Cohort name needs at least 2 characters')
    .max(60, 'Cohort name is too long'),
  cap: z.coerce
    .number()
    .int('Cap must be a whole number')
    .min(1, 'Cap must be at least 1')
    .max(10_000, 'Cap is unreasonably large'),
});
export type CohortCreateInput = z.infer<typeof cohortCreateSchema>;

export const cohortUpdateSchema = cohortCreateSchema.partial();
export type CohortUpdateInput = z.infer<typeof cohortUpdateSchema>;
