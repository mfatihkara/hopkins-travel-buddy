import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which rejects typical phone-camera photos before
      // our own avatar size check in updateProfile() ever runs.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
