/**
 * Branded Excalidraw embed — exposes a `CanvasController` via imperative
 * handle so the Pi extension can drive it.
 *
 * Excalidraw and its CSS are loaded lazily so that:
 *  - The SPA's main bundle stays lean.
 *  - jsdom-based unit tests for the controller don't try to evaluate
 *    Excalidraw's browser-only globals.
 */

import {
  forwardRef,
  Suspense,
  lazy,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CanvasController } from "../contracts/canvas";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import {
  createController,
  type ExcalidrawApiLike,
} from "./controller";
import { omnidrawAppStateDefaults, omnidrawUIOptions } from "./theme";

// Lazy chunk: real Excalidraw lives here. We point the runtime at the
// pre-built `dist/prod/index.css` (the workspace package's
// `build:packages` step produces this), keeping the SCSS sources out of
// the desktop bundle. The dynamic specifier is hidden behind a variable
// so Vite's alias `@excalidraw/excalidraw/*` (which maps to source) does
// not rewrite it.
const ExcalidrawLazy = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  // Side-effect import for stylesheet — only on the browser path.
  // The `/* @vite-ignore */` directive tells Vite to skip alias rewriting
  // and resolve the path at runtime against the published package's
  // `exports` map (CSS is declared there under the `production` /
  // `development` conditions).
  const cssPath = "@excalidraw/excalidraw/index.css";
  await import(/* @vite-ignore */ cssPath).catch(() => {
    /* CSS path differs between dev/prod builds — non-fatal. */
  });
  return { default: mod.Excalidraw };
});

export interface OmnidrawCanvasProps {
  /** Initial scene elements. */
  initialElements?: ExcalidrawElement[];
  /** Called with the imperative handle once the canvas is mounted. */
  onReady?: (controller: CanvasController) => void;
  /** Forwarded to Excalidraw. Defaults to false. */
  viewModeEnabled?: boolean;
  /** Forwarded to Excalidraw. Defaults to false. */
  zenModeEnabled?: boolean;
}

export const OmnidrawCanvas = forwardRef<CanvasController, OmnidrawCanvasProps>(
  function OmnidrawCanvas(
    { initialElements, onReady, viewModeEnabled, zenModeEnabled },
    ref,
  ) {
    const apiRef = useRef<ExcalidrawApiLike | null>(null);
    const [, setReady] = useState(false);

    const controller = useMemo<CanvasController>(
      () =>
        createController({
          getApi: () => apiRef.current,
        }),
      [],
    );

    useImperativeHandle(ref, () => controller, [controller]);

    return (
      <div
        className="relative w-full h-full"
        // Excalidraw paints inside this; the dark backdrop matches the panel.
        style={{ background: "var(--bg-panel, #0f1011)" }}
      >
        <Suspense fallback={<CanvasFallback />}>
          <ExcalidrawLazy
            onExcalidrawAPI={(api) => {
              apiRef.current = (api ?? null) as ExcalidrawApiLike | null;
              setReady(true);
              if (api) onReady?.(controller);
            }}
            initialData={
              initialElements
                ? {
                    elements: initialElements,
                    appState: { ...omnidrawAppStateDefaults },
                  }
                : { appState: { ...omnidrawAppStateDefaults } }
            }
            UIOptions={omnidrawUIOptions}
            viewModeEnabled={viewModeEnabled}
            zenModeEnabled={zenModeEnabled}
            name="Omnidraw"
          />
        </Suspense>
      </div>
    );
  },
);

function CanvasFallback() {
  return (
    <div
      className="absolute inset-0 grid place-items-center text-text-muted text-sm"
      role="status"
      aria-live="polite"
    >
      Loading canvas…
    </div>
  );
}
