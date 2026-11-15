import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "chisto.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  outputDir: "../../work/browser-results",
  webServer: [
    {
      command: "npm start -- -p 3002",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: false,
      env: { APP_MODE: "demo", TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "" },
    },
    {
      command: "npm start -- -p 3003",
      url: "http://127.0.0.1:3003",
      reuseExistingServer: false,
      env: {
        APP_MODE: "telegram",
        TELEGRAM_BOT_TOKEN: "",
        TELEGRAM_CHAT_ID: "",
      },
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:3002",
    actionTimeout: 8_000,
    viewport: { width: 1440, height: 1000 },
    locale: "ru-RU",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
});
