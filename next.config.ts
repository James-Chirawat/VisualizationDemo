import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `radix-ui` re-exports every primitive; rewrite `import { Dialog } from "radix-ui"` to the one package used.
    // lucide-react and recharts are already on Next's built-in list.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
