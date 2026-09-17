import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number(),
  CORS_ORIGINS: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_NAME: z.string().min(1),
  // AI Masterclass (OpenRouter — OpenAI-compatible). All config from env, never hardcoded.
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  AI_MODEL: z.string().default('stealth/ox-alpha'),
  // Timeout for BAML LLM calls (ms), applied to request/idle/time-to-first-token.
  // BAML's internal defaults are finite and too short for reasoning models that
  // sit silent for minutes mid-response. 0 → 24h ceiling (effectively unlimited).
  AI_TIMEOUT_MS: z.coerce.number().default(900_000),
  AI_DAILY_GEN_LIMIT: z.coerce.number().default(20),
  AI_DAILY_REGEN_LIMIT: z.coerce.number().default(50),
  // '1' → skip extraction + LLM entirely; deterministic fixture output (used by e2e)
  AI_MOCK: z.enum(['0', '1']).default('0'),
  // Journal content directory (PRD-07). Empty → repo-root `content/journal`
  // resolved from the service file, which matches both dev and the image.
  JOURNAL_DIR: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
