import { defineConfig, devices } from "@playwright/test";

const PORT = 5179;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  projects: [{ name: "mobile-chromium", use: { browserName: "chromium", ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
