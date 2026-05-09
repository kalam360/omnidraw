// Scoped vitest config for Team AGENT.
//
// The full app build is currently broken (assistant-ui scaffold drift, being
// fixed by Frontend). To unblock the Agent team, this config restricts
// Vitest to `src/agent/**` and stubs the workspace `@excalidraw/element`
// import path so we can compile contracts that reference
// `@excalidraw/element/types`.
//
// When the desktop app's `pnpm build` is healthy again, we should fold
// these into a single repo-level vitest config.

import path from "node:path";
import { defineConfig } from "vitest/config";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@excalidraw\/element$/,
        replacement: path.resolve(repoRoot, "packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*)/,
        replacement: path.resolve(repoRoot, "packages/element/src/$1"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/agent/**/*.test.ts", "src/agent/__tests__/**/*.test.ts"],
    // The agent code is pure logic (no React); node env is enough.
    setupFiles: [],
  },
});
