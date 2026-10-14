import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.2.79"],
  // The managed build environment drops stdout from detached TypeScript CLI
  // processes. Use Next's in-process compiler API for deterministic builds.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
