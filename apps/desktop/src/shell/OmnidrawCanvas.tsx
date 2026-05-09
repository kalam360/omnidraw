/**
 * Shell wrapper around the Canvas team's `<OmnidrawCanvas/>`.
 *
 * S10: now mounts the real Excalidraw-backed canvas from `@/canvas` and
 * binds it to the deferred canvas controller via `useDeferredCanvas().attach()`
 * so the agent (which holds the deferred reference at app start) can drive
 * it once the route is mounted.
 *
 * Loaded lazily by `routes/Session.tsx` and `presentation/PresentationMode.tsx`.
 */

import { useCallback, useEffect } from "react";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { OmnidrawCanvas as RealOmnidrawCanvas } from "@/canvas";
import type { CanvasController } from "@/contracts";
import { useDeferredCanvas } from "@/lib/adapters/adapters-context";

export interface OmnidrawCanvasProps {
  projectId: string;
  sceneId?: string;
  elements?: ExcalidrawElement[];
  /** When true, hide chrome and zoom-fit for presentation mode. */
  presentMode?: boolean;
}

export default function OmnidrawCanvas({
  elements,
  presentMode,
}: OmnidrawCanvasProps) {
  const deferred = useDeferredCanvas();

  const handleReady = useCallback(
    (controller: CanvasController) => {
      deferred.attach(controller);
    },
    [deferred],
  );

  // Detach on unmount so the deferred proxy stops forwarding to a torn-down
  // controller. Listeners are kept on the proxy and re-subscribed on remount.
  useEffect(() => {
    return () => {
      deferred.detach();
    };
  }, [deferred]);

  return (
    <div
      className="flex flex-1 flex-col bg-bg-page"
      data-testid="canvas-stage"
    >
      <RealOmnidrawCanvas
        initialElements={elements}
        onReady={handleReady}
        viewModeEnabled={presentMode}
        zenModeEnabled={presentMode}
      />
    </div>
  );
}
