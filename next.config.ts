import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001", "*.devtunnels.ms", "*.vscode.dev"],
    },
  },
  images: {
    remotePatterns: [
       {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
