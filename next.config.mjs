import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Pin the workspace root so Next doesn't mis-detect it when other lockfiles
  // exist elsewhere on the machine (silences the multiple-lockfile build warning).
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
