import { defineConfig, devices } from "@playwright/test";

/**
 * E2E configuration.
 *  - `smoke` specs need no backend session and run everywhere (CI and local).
 *  - `auth` specs need a running Supabase stack (`supabase start`) with seeded
 *    users; they run in the CI job `e2e-supabase` (see TESTING.md).
 * Set PW_CHROMIUM_PATH to use a pre-installed Chromium binary.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        url: `http://127.0.0.1:${port}/privacy`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
