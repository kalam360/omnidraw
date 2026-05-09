/**
 * Local shim for `@excalidraw/element/types`.
 *
 * The Foundation team's contracts import `ExcalidrawElement` from
 * `@excalidraw/element/types`. The published exports map for the workspace
 * package resolves that subpath to a built `dist/types/element/src/types.d.ts`
 * file that doesn't exist until the package is built — and pulling the
 * source file directly drags every other workspace package's source into
 * the typecheck graph (each one currently has its own type errors).
 *
 * The Frontend team needs a stable type symbol but doesn't actually
 * manipulate Excalidraw elements; they're forwarded through to the Canvas
 * team's adapter. So we declare a minimal structural type here. The
 * Canvas team will replace this shim with the real package once integration
 * is unblocked (most likely by building the `@excalidraw/element` package
 * once before typechecking, or by the package shipping bundled types).
 */

export type ExcalidrawElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Excalidraw allows arbitrary additional props per element type.
  [key: string]: unknown;
};

export type NonDeleted<T> = T & { isDeleted: false };
