// @ts-check
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("@playwright/test");

const baseURL = "http://localhost:3000";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000,
      },
});
