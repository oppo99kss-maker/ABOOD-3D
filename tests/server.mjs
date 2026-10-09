import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const port = process.argv[2];
const configured = process.argv[3] === "configured";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXTAUTH_URL: `http://localhost:${port}`,
      GOOGLE_CLIENT_ID: configured
        ? "abood-test.apps.googleusercontent.com"
        : "",
      GOOGLE_CLIENT_SECRET: configured ? randomBytes(32).toString("hex") : "",
      NEXTAUTH_SECRET: configured ? randomBytes(32).toString("hex") : "",
    },
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
