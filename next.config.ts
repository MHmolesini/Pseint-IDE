import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Pseint-IDE',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
