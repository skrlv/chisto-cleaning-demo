import type { NextConfig } from "next";
import path from "node:path";

const githubPages = process.env.GITHUB_PAGES === "1";
const basePath = githubPages
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "")
  : "";

if (basePath && !/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(basePath)) {
  throw new Error(
    "NEXT_PUBLIC_BASE_PATH должен быть путём вроде /chisto-cleaning-demo.",
  );
}

const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    // The isolated Pages builder reuses dependencies from the parent project.
    root: path.resolve(process.env.CHISTO_BUILD_ROOT ?? process.cwd()),
  },
  ...(githubPages
    ? {
        output: "export",
        // With output: export, this names the final static directory. Build in
        // an isolated directory to preserve the local server's .next files.
        distDir: "out",
        trailingSlash: true,
        images: { unoptimized: true },
        // Pages/layouts are .tsx; the server-only POST route is route.ts.
        pageExtensions: ["tsx"],
      }
    : {}),
};
export default config;
