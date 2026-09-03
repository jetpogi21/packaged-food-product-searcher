import { defineConfig } from "@playwright/test";

const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3100);
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? 3101);
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
process.env.PLAYWRIGHT_WEB_BASE_URL ??= webBaseUrl;
process.env.PLAYWRIGHT_API_BASE_URL ??= apiBaseUrl;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: webBaseUrl,
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run test:servers",
    url: webBaseUrl,
    timeout: 120_000,
    env: {
      ...process.env,
      SEARCH_HISTORY_STORE: "memory",
      PAYMENTS_STORE: "memory",
      PAYMENTS_PROVIDER: "mock",
      NUTRITION_PROVIDER: "mock",
      APP_URL: webBaseUrl,
      PORT: String(apiPort),
      E2E_WEB_PORT: String(webPort),
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      STRIPE_WEBHOOK_SECRET: "whsec_payments_test_secret"
    },
    reuseExistingServer: !process.env.CI
  }
});
