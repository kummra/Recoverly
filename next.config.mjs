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
  async redirects() {
    return [
      {
        // The site was first deployed at recoverly-app.vercel.app, and that
        // address still answers with the whole site. Press releases, and any
        // search engine that found it first, still point there. A permanent
        // redirect moves those links, and the ranking they carry, onto the real
        // domain instead of splitting them between two copies of every page.
        // `/api` is left alone so a cron job or a webhook that was set up
        // against the old address keeps working.
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "recoverly-app.vercel.app" }],
        destination: "https://recoverly.co.in/:path",
        permanent: true
      },
      {
        // Each language's pages live under its own prefix (/hi/learn, /hi/support
        // and so on) but nothing answers at the bare prefix, so /hi, /ml and the
        // rest were 404s, and Google found /ml and listed it as an error. The home
        // page is one page for every language, so that is where a person who
        // types one of these addresses should land. Temporary on purpose: a
        // permanent redirect is cached by browsers for good, and a translated
        // home page at /hi is a thing we may build later.
        source: "/:locale(hi|mr|pa|ta|te|kn|ml|gu)",
        destination: "/",
        permanent: false
      }
    ];
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
