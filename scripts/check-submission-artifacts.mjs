import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];

function read(relativePath) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }

  return readFileSync(path, "utf8");
}

function requireText(relativePath, source, phrases) {
  for (const phrase of phrases) {
    if (!source.includes(phrase)) {
      failures.push(`${relativePath} is missing ${JSON.stringify(phrase)}`);
    }
  }
}

const readme = read("README.md");
requireText("README.md", readme, [
  "## Local setup",
  "## Internationalization",
  "## Stripe test flow",
  "## Technical decisions",
  "## Known limitations",
  "## No deployment",
]);

const envExample = read(".env.example");
requireText(".env.example", envExample, [
  "DATABASE_URL=",
  "APP_URL=",
  "STRIPE_SECRET_KEY=\"sk_test_replace_me\"",
  "STRIPE_WEBHOOK_SECRET=\"whsec_replace_me\"",
  "STRIPE_PRICE_ID=\"price_replace_me\"",
  "SEARCH_HISTORY_STORE=\"prisma\"",
  "PAYMENTS_STORE=\"prisma\"",
  "PAYMENTS_PROVIDER=\"stripe\"",
  "NUTRITION_PROVIDER=\"openfoodfacts\"",
]);

for (const migration of [
  "prisma/migrations/20260902130000_add_demo_user_search_history/migration.sql",
  "prisma/migrations/20260903100000_add_subscription_entitlements/migration.sql",
]) {
  read(migration);
}

const packageJson = read("package.json");
requireText("package.json", packageJson, [
  "\"test:product-search\"",
  "\"test:localization\"",
  "\"test:checkout-entitlement\"",
  "\"test:checkout-association\"",
  "\"verify:submission\"",
]);

if (failures.length > 0) {
  console.error("Submission artifact verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Submission artifacts verified: README, environment template, migrations, and focused commands are present.");
}
