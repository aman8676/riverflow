import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloud.appwrite.io", // change if self-hosted
      },
    ],
  },
};

export default nextConfig;
