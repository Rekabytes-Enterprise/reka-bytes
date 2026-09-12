-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "cohortId" TEXT;

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cap" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_name_key" ON "Cohort"("name");

-- CreateIndex
CREATE INDEX "Application_cohortId_idx" ON "Application"("cohortId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Seed + backfill: cohorts now own the capacity limit (was COHORT_CAP=5) ──
-- Cohort 001 is the historical implicit cohort; every existing application
-- belongs to it. It starts as the current cohort so registration keeps working.
INSERT INTO "Cohort" ("id", "name", "cap", "isCurrent", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Cohort 001', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Application" SET "cohortId" = (SELECT "id" FROM "Cohort" WHERE "name" = 'Cohort 001')
WHERE "cohortId" IS NULL;
