/**
 * Element-construction helpers used by the agent's create/add/update/remove
 * tool calls.
 *
 * The shapes returned here are intentionally permissive — they cover the
 * common fields the agent will set, then `restoreElements` from
 * `@excalidraw/excalidraw` is applied inside the controller to fill in the
 * remaining required fields (versionNonce, seed, etc.) so that the resulting
 * objects are valid `ExcalidrawElement`s.
 *
 * Keeping these tiny + dependency-free makes them easy to call from the agent
 * sidecar (which doesn't have Excalidraw loaded).
 */

export interface BaseShorthand {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
}

export interface RectangleSpec extends BaseShorthand {
  kind: "rectangle";
  label?: string;
}

export interface EllipseSpec extends BaseShorthand {
  kind: "ellipse";
  label?: string;
}

export interface DiamondSpec extends BaseShorthand {
  kind: "diamond";
  label?: string;
}

export interface TextSpec extends Omit<BaseShorthand, "width" | "height"> {
  kind: "text";
  text: string;
  fontSize?: number;
}

export interface ArrowSpec extends BaseShorthand {
  kind: "arrow";
  /** Endpoint relative to (x, y). */
  dx: number;
  dy: number;
  startId?: string;
  endId?: string;
}

export type ElementSpec =
  | RectangleSpec
  | EllipseSpec
  | DiamondSpec
  | TextSpec
  | ArrowSpec;

let counter = 0;
function nextId(prefix = "el"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** Build a partial element shape ready for `convertToExcalidrawElements`. */
export function buildElement(spec: ElementSpec): Record<string, unknown> {
  const id = spec.id ?? nextId(spec.kind);
  const common = {
    id,
    x: spec.x,
    y: spec.y,
    strokeColor: spec.strokeColor ?? "#1e1e1e",
    backgroundColor: spec.backgroundColor ?? "transparent",
    strokeWidth: spec.strokeWidth ?? 2,
    roughness: spec.roughness ?? 1,
    opacity: spec.opacity ?? 100,
  };

  switch (spec.kind) {
    case "rectangle":
    case "ellipse":
    case "diamond":
      return {
        ...common,
        type: spec.kind,
        width: spec.width ?? 120,
        height: spec.height ?? 80,
        ...(spec.label ? { label: { text: spec.label } } : {}),
      };
    case "text":
      return {
        ...common,
        type: "text",
        text: spec.text,
        fontSize: spec.fontSize ?? 20,
      };
    case "arrow":
      return {
        ...common,
        type: "arrow",
        width: spec.width ?? Math.abs(spec.dx),
        height: spec.height ?? Math.abs(spec.dy),
        points: [
          [0, 0],
          [spec.dx, spec.dy],
        ],
        ...(spec.startId
          ? { start: { id: spec.startId, type: "rectangle" } }
          : {}),
        ...(spec.endId
          ? { end: { id: spec.endId, type: "rectangle" } }
          : {}),
      };
  }
}

/** Build a list of shorthand specs into element-shape objects. */
export function buildElements(specs: ElementSpec[]): Record<string, unknown>[] {
  return specs.map(buildElement);
}
