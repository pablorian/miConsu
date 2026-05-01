import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose', 'mongodb', '@repo/database'],

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    turbopack: {
      root: path.resolve(__dirname, '../../'),
    }
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/oauth/well-known',
      },
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/oauth/protected-resource',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
