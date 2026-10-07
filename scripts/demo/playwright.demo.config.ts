import { defineConfig } from "@playwright/test";

// Public demo recording (npm run demo:record). The story launches its own
// persistent browser contexts, so it reads JOB_RANGER_PW_CHROMIUM itself.
export default defineConfig({
  testDir: ".",
  testMatch: "story.spec.ts",
  timeout: 300_000,
  outputDir: "../../test-results/demo",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { browserName: "chromium" },
});
