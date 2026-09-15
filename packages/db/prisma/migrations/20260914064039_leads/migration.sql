-- CreateEnum
CREATE TYPE "LeadService" AS ENUM ('CONSULTATION', 'MOCKUP', 'PRD', 'BUILD');

-- CreateEnum
CREATE TYPE "LeadPlatform" AS ENUM ('MOBILE', 'WEB', 'BOTH', 'UNSURE');

-- CreateEnum
CREATE TYPE "LeadBudget" AS ENUM ('UNDER_5K', 'RANGE_5_15K', 'RANGE_15_50K', 'OVER_50K', 'UNSURE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "service" "LeadService" NOT NULL DEFAULT 'CONSULTATION',
    "platform" "LeadPlatform" NOT NULL DEFAULT 'UNSURE',
    "budget" "LeadBudget" NOT NULL DEFAULT 'UNSURE',
    "message" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
