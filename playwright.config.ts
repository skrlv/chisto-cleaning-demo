import { defineConfig } from "@playwright/test";

const publicUrl = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "./e2e",
  testMatch: "pages.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 35_000,
  reporter: "list",
  outputDir: "../../work/pages-browser-results",
  webServer: publicUrl ? undefined : {
    command: "npm run preview:pages",
    url: "http://127.0.0.1:4182/chisto-cleaning-demo/",
    env: { PORT: "4182" },
    reuseExistingServer: false,
  },
  use: {
    baseURL: publicUrl ?? "http://127.0.0.1:4182/chisto-cleaning-demo/",
    viewport: { width: 1440, height: 1000 },
    locale: "ru-RU",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
});
