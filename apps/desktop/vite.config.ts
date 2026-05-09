import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // App-level alias.
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
      // The vendored `@excalidraw/*` workspace packages declare entry
      // points only under the `production`/`development` export
      // conditions, which Vite/Rollup don't set by default. Mirroring
      // upstream `excalidraw-app/vite.config.mts`, we alias each package
      // (and its sub-paths) to its source files. This lets vite resolve
      // transitive imports like `@excalidraw/fractional-indexing` from
      // inside the built `packages/excalidraw/dist/prod/index.js`.
      {
        find: /^@excalidraw\/common$/,
        replacement: path.resolve(monorepoRoot, "packages/common/src/index.ts"),
      },
      {
        find: /^@excalidraw\/common\/(.*)/,
        replacement: path.resolve(monorepoRoot, "packages/common/src/$1"),
      },
      {
        find: /^@excalidraw\/element$/,
        replacement: path.resolve(monorepoRoot, "packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*)/,
        replacement: path.resolve(monorepoRoot, "packages/element/src/$1"),
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: path.resolve(monorepoRoot, "packages/excalidraw/index.tsx"),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*)/,
        replacement: path.resolve(monorepoRoot, "packages/excalidraw/$1"),
      },
      {
        find: /^@excalidraw\/math$/,
        replacement: path.resolve(monorepoRoot, "packages/math/src/index.ts"),
      },
      {
        find: /^@excalidraw\/math\/(.*)/,
        replacement: path.resolve(monorepoRoot, "packages/math/src/$1"),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(monorepoRoot, "packages/utils/src/index.ts"),
      },
      {
        find: /^@excalidraw\/utils\/(.*)/,
        replacement: path.resolve(monorepoRoot, "packages/utils/src/$1"),
      },
      {
        find: /^@excalidraw\/fractional-indexing$/,
        replacement: path.resolve(
          monorepoRoot,
          "packages/fractional-indexing/src/index.ts",
        ),
      },
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  // The Canvas team's <OmnidrawCanvas/> is lazy-loaded via React.lazy(),
  // which Vite/Rollup automatically splits into its own chunk. The
  // Excalidraw bundle only loads on routes that mount the canvas
  // (Session, PresentationMode).
});
