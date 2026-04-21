import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/my-tab" : "",
  assetPrefix: isProd ? "/my-tab/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
