import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No `output: "standalone"`. It broke Vercel's build on Next 16.3 (missing
  // next-server.js.nft.json) and nothing needs it: Vercel builds its own
  // output, and the Dockerfile copies .next + node_modules and runs `npm start`
  // rather than the standalone server.
  // The Oracle driver is a Node-native package; keep it external so the server
  // bundler doesn't try to trace/bundle its binary bits (it's only used in
  // nodejs route handlers, never in the browser).
  serverExternalPackages: ["oracledb"],
  // Pin the workspace root so Next doesn't mis-detect it when other lockfiles
  // exist elsewhere on the machine (silences the multiple-lockfile build warning).
  turbopack: {
    root: __dirname
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app needs none of these. Denying them means a compromised
          // dependency still can't reach a user's camera, mic or location.
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "magnetometer=()",
              "accelerometer=()",
              "gyroscope=()"
            ].join(", ")
          },
          // Vercel already sets HSTS, X-Frame-Options, X-Content-Type-Options
          // and Referrer-Policy; these are the gaps.
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" }
        ]
      },
      {
        // Personal recovery data must never sit in a shared or proxy cache.
        // Scoped to the API only — page assets are hashed and immutable, so a
        // blanket no-store here would throw away caching for no benefit.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }]
      }
    ];
  }
};

export default nextConfig;
