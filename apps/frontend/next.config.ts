import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Enable standalone output for Docker deployments
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Tell Next.js (Turbopack) where the monorepo root is to avoid the lockfile warning
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
