import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// next.config.ts sits in packages/<app>/, workspace root is two levels up
const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@reka-bytes/shared'],
  turbopack: {
    // Pin the workspace root so Next doesn't infer it from a stray lockfile
    root: workspaceRoot,
  },
  async rewrites() {
    // Same-origin API proxy → avoids cross-origin cookie issues between ports
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:4300'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
