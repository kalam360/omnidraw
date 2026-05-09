import { defineConfig } from "vitest/config";

/**
 * Storage-only vitest config. Scoped to `src/storage/**` so the test
 * runner doesn't try to typecheck or load the rest of the desktop app
 * (which depends on assistant-ui scaffolding still landing in other
 * teams' worktrees).
 */
export default defineConfig({
  test: {
    include: ["src/storage/**/*.test.ts"],
    environment: "node",
    globals: false,
    pool: "threads",
    isolate: true,
    typecheck: {
      enabled: false,
    },
  },
});
