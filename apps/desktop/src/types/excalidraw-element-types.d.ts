/**
 * Local shims for the workspace `@excalidraw/*` packages.
 *
 * The vendored Excalidraw packages declare TypeScript types that resolve to
 * `dist/types/...` files which only exist after a build. The desktop app
 * doesn't run that build at typecheck time (the Excalidraw source itself
 * has its own type errors we don't want to absorb), so we provide minimal
 * structural shims for the symbols our adapters actually depend on.
 *
 * S10 (Tauri) cleanup: switch to building the workspace types once before
 * typechecking, or have the Excalidraw packages ship pre-built types.
 *
 * NOTE: The original location of this shim was a single-export module for
 * `@excalidraw/element/types`. After Canvas + Frontend merged we also need
 * to satisfy `@excalidraw/excalidraw` (component import + CSS side-effect
 * import). Keeping all shims in one file so they're easy to delete later.
 */

declare module "@excalidraw/element/types" {
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
}

declare module "@excalidraw/excalidraw" {
  import type { ComponentType, RefObject } from "react";
  import type { ExcalidrawElement } from "@excalidraw/element/types";

  export interface ExcalidrawImperativeAPI {
    updateScene(scene: {
      elements?: readonly ExcalidrawElement[];
      appState?: Record<string, unknown>;
      captureUpdate?: unknown;
    }): void;
    getSceneElements(): readonly ExcalidrawElement[];
    getAppState(): Record<string, unknown>;
    onChange(
      cb: (
        elements: readonly ExcalidrawElement[],
        appState: Record<string, unknown>,
        files: unknown,
      ) => void,
    ): () => void;
  }

  export interface ExcalidrawProps {
    initialData?: {
      elements?: readonly ExcalidrawElement[];
      appState?: Record<string, unknown>;
      scrollToContent?: boolean;
    };
    excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void;
    ref?: RefObject<ExcalidrawImperativeAPI | null>;
    viewModeEnabled?: boolean;
    zenModeEnabled?: boolean;
    UIOptions?: Record<string, unknown>;
    theme?: "light" | "dark";
    onChange?: (
      elements: readonly ExcalidrawElement[],
      appState: Record<string, unknown>,
      files: unknown,
    ) => void;
    [key: string]: unknown;
  }

  export const Excalidraw: ComponentType<ExcalidrawProps>;
  export function exportToBlob(opts: Record<string, unknown>): Promise<Blob>;
  export function exportToSvg(opts: Record<string, unknown>): Promise<SVGSVGElement>;
}

declare module "@excalidraw/excalidraw/index.css";
