/*
  Warnings:

  - You are about to drop the column `blockEvents` on the `LessonProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LessonProgress" DROP COLUMN "blockEvents";

-- CreateTable
CREATE TABLE "BlockEvent" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockEvent_lessonId_userId_idx" ON "BlockEvent"("lessonId", "userId");

-- AddForeignKey
ALTER TABLE "BlockEvent" ADD CONSTRAINT "BlockEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockEvent" ADD CONSTRAINT "BlockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
