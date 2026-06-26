import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // The Oracle driver is a Node-native package; keep it external so the server
  // bundler doesn't try to trace/bundle its binary bits (it's only used in
  // nodejs route handlers, never in the browser).
  serverExternalPackages: ["oracledb"],
  // Pin the workspace root so Next doesn't mis-detect it when other lockfiles
  // exist elsewhere on the machine (silences the multiple-lockfile build warning).
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
