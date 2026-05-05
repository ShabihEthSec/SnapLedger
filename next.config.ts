// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@qvac/sdk"],

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
