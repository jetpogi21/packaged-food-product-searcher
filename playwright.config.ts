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
    timeout: 120_000,
    env: {
      ...process.env,
      SEARCH_HISTORY_STORE: "memory",
      PAYMENTS_STORE: "memory",
      PAYMENTS_PROVIDER: "mock",
      NUTRITION_PROVIDER: "mock",
      APP_URL: "http://127.0.0.1:3000",
      STRIPE_WEBHOOK_SECRET: "whsec_payments_test_secret"
    },
    reuseExistingServer: !process.env.CI
  }
});
