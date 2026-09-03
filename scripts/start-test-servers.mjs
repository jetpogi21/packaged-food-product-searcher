import { spawn } from "node:child_process";
import { resolve } from "node:path";

const node = process.execPath;
const webPort = process.env.E2E_WEB_PORT ?? "3000";
const children = [
  spawn(node, [resolve("node_modules/tsx/dist/cli.mjs"), "apps/api/src/index.ts"], { stdio: "inherit" }),
  spawn(node, [resolve("node_modules/next/dist/bin/next"), "dev", "apps/web", "--port", webPort], { stdio: "inherit" })
];

function stopChildren() {
  for (const child of children) child.kill();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopChildren();
    process.exit(0);
  });
}

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopChildren();
      process.exitCode = code;
    }
  });
}
