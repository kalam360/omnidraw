/**
 * Public surface of the canvas team.
 *
 * Frontend consumes `OmnidrawCanvas` and the `createCanvas()` factory.
 * Agent consumes the `CanvasController` type via `contracts/canvas.ts`.
 */

export { OmnidrawCanvas } from "./OmnidrawCanvas";
export type { OmnidrawCanvasProps } from "./OmnidrawCanvas";
export { createController, type ExcalidrawApiLike } from "./controller";
export {
  buildElement,
  buildElements,
  type ElementSpec,
  type RectangleSpec,
  type EllipseSpec,
  type DiamondSpec,
  type TextSpec,
  type ArrowSpec,
} from "./tools";
export { DrawingReplay } from "./replay/DrawingReplay";
export type { DrawingReplayProps, ReplayEvent } from "./replay/DrawingReplay";
export {
  omnidrawAppStateDefaults,
  omnidrawUIOptions,
  OMNIDRAW_ACCENT,
  OMNIDRAW_BG,
} from "./theme";

import type { ComponentProps, RefObject } from "react";
import { createElement } from "react";
import { OmnidrawCanvas } from "./OmnidrawCanvas";
import type { CanvasController } from "../contracts/canvas";

/**
 * Convenience factory used by Frontend's BrandShell:
 *
 *   const { node, ref } = createCanvas({ initialElements });
 *   // pass `ref.current` to the agent runtime once mounted.
 */
export function createCanvas(
  props: ComponentProps<typeof OmnidrawCanvas> & {
    ref: RefObject<CanvasController | null>;
  },
) {
  const { ref, ...rest } = props;
  return createElement(OmnidrawCanvas, { ...rest, ref });
}
