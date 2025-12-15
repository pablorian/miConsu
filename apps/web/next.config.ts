import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose', 'mongodb', '@repo/database'],

  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopack: {
      root: path.resolve(__dirname, '../../'),
    }
  }
};

export default nextConfig;
