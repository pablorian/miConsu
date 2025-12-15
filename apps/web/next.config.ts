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
  }
};

export default withNextIntl(nextConfig);
