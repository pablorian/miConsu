import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose', 'mongodb', '@repo/database'],

  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
