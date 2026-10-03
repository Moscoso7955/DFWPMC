import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    // Venue documents, assets and RSC prefetches must leave this zone before
    // Vercel considers this application's own CMS and prerendered routes.
    return { beforeFiles: [
      {
        source: "/madrone",
        destination: "https://fwpublicmarket-madrone.vercel.app/madrone",
      },
      {
        source: "/madrone/:path*",
        destination: "https://fwpublicmarket-madrone.vercel.app/madrone/:path*",
      },
      {
        source: "/willow",
        destination: "https://fwpublicmarket-willow.vercel.app/willow",
      },
      {
        source: "/willow/:path*",
        destination: "https://fwpublicmarket-willow.vercel.app/willow/:path*",
      },
      {
        source: "/publicmarketcafe",
        destination: "https://fwpublicmarket-publicmarketcafe.vercel.app/publicmarketcafe",
      },
      {
        source: "/publicmarketcafe/:path*",
        destination: "https://fwpublicmarket-publicmarketcafe.vercel.app/publicmarketcafe/:path*",
      },
    ] };
  },
};

export default nextConfig;
