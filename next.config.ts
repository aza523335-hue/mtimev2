import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/isomorphic-fetch",
    "libsql",
  ],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(md|license)$/i,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
