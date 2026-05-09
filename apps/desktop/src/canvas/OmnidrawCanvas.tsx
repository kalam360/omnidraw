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

// Lazy chunk: real Excalidraw lives here.
const ExcalidrawLazy = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  // Side-effect import for stylesheet — only on the browser path.
  await import("@excalidraw/excalidraw/index.css").catch(() => {
    /* css path differs between builds — non-fatal in dev */
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
            excalidrawAPI={(api) => {
              apiRef.current = api as ExcalidrawApiLike;
              setReady(true);
              onReady?.(controller);
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
