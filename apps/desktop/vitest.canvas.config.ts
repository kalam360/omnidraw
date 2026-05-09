/**
 * Scoped vitest config — runs only the Canvas team's tests.
 *
 * Why scoped:
 *   - Foundation phase build is failing for the assistant-ui scaffold
 *     (Frontend's territory). We don't want our acceptance signal coupled
 *     to that.
 *   - Excalidraw resolves through the workspace TS source (no `dist`
 *     present), so we mirror the alias setup from the root
 *     `vitest.config.mts`.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@excalidraw\/common$/,
        replacement: path.resolve(repo, "packages/common/src/index.ts"),
      },
      {
        find: /^@excalidraw\/common\/(.*)$/,
        replacement: path.resolve(repo, "packages/common/src/$1"),
      },
      {
        find: /^@excalidraw\/element$/,
        replacement: path.resolve(repo, "packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*)$/,
        replacement: path.resolve(repo, "packages/element/src/$1"),
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: path.resolve(repo, "packages/excalidraw/index.tsx"),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*)$/,
        replacement: path.resolve(repo, "packages/excalidraw/$1"),
      },
      {
        find: /^@excalidraw\/math$/,
        replacement: path.resolve(repo, "packages/math/src/index.ts"),
      },
      {
        find: /^@excalidraw\/math\/(.*)$/,
        replacement: path.resolve(repo, "packages/math/src/$1"),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(repo, "packages/utils/src/index.ts"),
      },
      {
        find: /^@excalidraw\/utils\/(.*)$/,
        replacement: path.resolve(repo, "packages/utils/src/$1"),
      },
      {
        find: /^@excalidraw\/fractional-indexing$/,
        replacement: path.resolve(
          repo,
          "packages/fractional-indexing/src/index.ts",
        ),
      },
      {
        find: /^@excalidraw\/fractional-indexing\/(.*)$/,
        replacement: path.resolve(
          repo,
          "packages/fractional-indexing/src/$1",
        ),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/canvas/**/*.test.ts", "src/canvas/**/*.test.tsx"],
    // Foundation phase: only canvas tests; we don't load setupTests for
    // the rest of the monorepo here.
  },
});
