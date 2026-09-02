import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run test:servers",
    url: "http://127.0.0.1:3000",
    env: {
      ...process.env,
      SEARCH_HISTORY_STORE: "memory"
    },
    reuseExistingServer: !process.env.CI
  }
});
