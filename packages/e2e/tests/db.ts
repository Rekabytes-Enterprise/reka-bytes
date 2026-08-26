import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

/** Lazy singleton postgres pool for direct test seeding/cleanup. */
export function getPg(): Pool {
  if (!pool) {
    const url =
      process.env.DATABASE_URL ??
      'postgresql://reka:reka_dev_password@localhost:5433/rekabytes?schema=public';
    pool = new Pool({ connectionString: url, max: 2 });
  }
  return pool;
}

export const pgClient = {
  query<T extends QueryResultRow>(text: string, params?: unknown[]) {
    return getPg().query<T>(text, params as never[]);
  },
};
