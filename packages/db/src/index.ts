import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

/**
 * Shared PrismaClient instance (Prisma 7 — queryCompiler + pg driver adapter).
 * Cached on globalThis to survive hot reloads in dev.
 */
const globalForPrisma = globalThis as unknown as { prisma?: InstanceType<typeof PrismaClient> };

function createClient(): InstanceType<typeof PrismaClient> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required (see packages/db/.env.example)');
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type {
  User,
  Application,
  AuditLog,
  Class,
  Module,
  Lesson,
  Quiz,
  QuizQuestion,
  LessonProgress,
  QuizAttempt,
} from './generated/prisma/client';
export { Role, UserStatus, Prisma } from './generated/prisma/client';
export * from './json';
