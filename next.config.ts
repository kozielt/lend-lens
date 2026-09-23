import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: nothing is cached unless it says `'use cache'`, uncached I/O must sit
  // behind <Suspense>, and every route gets a prerendered static shell (Partial Prerendering).
  cacheComponents: true,
  // Self-hosting proof: `.next/standalone/server.js` runs without Vercel (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
