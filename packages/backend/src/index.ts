import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env, corsOrigins } from './env';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './routes/auth.routes';
import { adminAuthRoutes } from './routes/admin-auth.routes';
import { publicRoutes } from './routes/public.routes';
import { adminRoutes } from './routes/admin.routes';
import { learnRoutes } from './routes/learn.routes';

const app = new Hono();

app.use(logger());
app.use(
  '/api/*',
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ data: { status: 'ok', service: 'reka-bytes-api' } }));

app.route('/api/auth', authRoutes);
app.route('/api/public', publicRoutes);
// adminAuthRoutes must mount BEFORE adminRoutes: it carries the unauthenticated
// POST /api/admin/login; everything after is requireAdmin-guarded.
app.route('/api/admin', adminAuthRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/learn', learnRoutes);

app.onError(errorHandler);

app.notFound((c) =>
  c.json(
    { error: { code: 'NOT_FOUND', message: `No route for ${c.req.method} ${c.req.path}` } },
    404,
  ),
);

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`▲ reka-bytes API listening on http://localhost:${info.port}`);
});

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n[${signal}] shutting down…`);
    server.close(() => process.exit(0));
  });
}
