import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    channel:
      process.env.BROWSER_CHANNEL ||
      (process.platform === "win32" ? "chrome" : undefined),
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/server.mjs 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node tests/server.mjs 3101 configured",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
