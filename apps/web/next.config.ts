import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@argus/core', '@argus/db'],
  serverExternalPackages: ['postgres', 'bcryptjs', 'ioredis', 'bullmq'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
