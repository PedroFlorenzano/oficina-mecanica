import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  baseURL: "http://localhost:3000",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
