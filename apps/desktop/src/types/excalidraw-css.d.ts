/**
 * The `@excalidraw/excalidraw/index.css` sub-path is resolved by Vite/Rollup
 * via the package's `exports` map (development/production conditions), but
 * the package ships no `.d.ts` for the CSS path, so TypeScript can't type
 * the `import()` call. This ambient declaration satisfies the typecheck
 * without affecting the actual bundle output (CSS imports are side-effects
 * only — we never read the module's exports).
 */
declare module "@excalidraw/excalidraw/index.css";
