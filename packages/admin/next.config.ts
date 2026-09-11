import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// next.config.ts sits in packages/<app>/, workspace root is two levels up
const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@reka-bytes/shared'],
  // Docker deploys (docker/frontend.Dockerfile / docker/admin.Dockerfile):
  // standalone emits a self-contained server.js + traced node_modules.
  // No effect on `pnpm dev`.
  output: 'standalone',
  // Trace from the workspace root so standalone includes workspace deps.
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    // Pin the workspace root so Next doesn't infer it from a stray lockfile
    root: workspaceRoot,
  },
};

export default nextConfig;
