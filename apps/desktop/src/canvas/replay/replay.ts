/**
 * Core replay logic — adapted from CopilotKit/excalidraw-studio's
 * `mcp-app.tsx` (MIT). The studio version is tightly coupled to the
 * MCP iframe runtime; this module factors out the pure DOM-mutating
 * parts so they can be driven from any element stream and unit-tested
 * in isolation.
 *
 * See `LICENSES.md` for attribution.
 *
 * The flow:
 *   1. We own a wrapper `<div>`. React must never re-render its
 *      children — morphdom mutates the DOM directly.
 *   2. For each element appended to the buffer we call Excalidraw's
 *      `exportToSvg(elements)`, then morphdom-merge the resulting
 *      `<svg>` over whatever's already in the wrapper.
 *   3. Once the stream emits `{ kind: "done" }` the replay is final.
 */

import type { ExcalidrawElement } from "@excalidraw/element/types";

/** Minimal subset of `exportToSvg` we depend on. */
export type ExportToSvgFn = (args: {
  elements: readonly ExcalidrawElement[];
  appState?: Record<string, unknown>;
  files?: unknown;
  exportPadding?: number;
  skipInliningFonts?: boolean;
}) => Promise<SVGSVGElement>;

/** Minimal subset of `morphdom` we depend on. */
export type MorphdomFn = (
  fromNode: Node,
  toNode: Node | string,
  options?: { childrenOnly?: boolean },
) => Node;

/**
 * Render a frame of elements into the wrapper. Idempotent — calling it
 * with the same elements twice is a no-op (morphdom diff -> no changes).
 */
export async function renderFrame(
  wrapper: HTMLElement,
  elements: readonly ExcalidrawElement[],
  exportToSvg: ExportToSvgFn,
  morphdom: MorphdomFn,
  options?: { exportPadding?: number },
): Promise<void> {
  if (elements.length === 0) {
    // Empty frame — clear out whatever's there so the canvas-card looks blank.
    while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    return;
  }

  const svg = await exportToSvg({
    elements,
    appState: {
      viewBackgroundColor: "transparent",
      exportBackground: false,
    },
    files: null,
    exportPadding: options?.exportPadding ?? 12,
    skipInliningFonts: true,
  });

  // Make the SVG fill the card.
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const existing = wrapper.querySelector("svg");
  if (existing) {
    morphdom(existing, svg, { childrenOnly: false });
  } else {
    wrapper.appendChild(svg);
  }
}

export type ReplayEvent =
  | { kind: "element"; element: ExcalidrawElement }
  | { kind: "done" };

export interface PlayOptions {
  /** Per-element delay in ms. Default 200ms — matches studio's pacing. */
  elementDelayMs?: number;
  /** Optional cancellation. */
  signal?: AbortSignal;
  /** Hook for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((res) => {
    if (ms <= 0) res();
    else setTimeout(res, ms);
  });

/**
 * Drive a replay end-to-end against a wrapper. Each element appended to
 * the cumulative buffer triggers a `renderFrame()` call; `done` resolves
 * the returned promise.
 */
export async function play(
  wrapper: HTMLElement,
  stream:
    | AsyncIterable<ReplayEvent>
    | Iterable<ReplayEvent>,
  exportToSvg: ExportToSvgFn,
  morphdom: MorphdomFn,
  options: PlayOptions = {},
): Promise<{ frames: number; elements: number }> {
  const sleep = options.sleep ?? defaultSleep;
  const delay = options.elementDelayMs ?? 200;
  const buffer: ExcalidrawElement[] = [];
  let frames = 0;

  for await (const ev of toAsyncIterable(stream)) {
    if (options.signal?.aborted) break;
    if (ev.kind === "element") {
      buffer.push(ev.element);
      await renderFrame(wrapper, buffer, exportToSvg, morphdom);
      frames += 1;
      if (delay > 0) await sleep(delay);
    } else if (ev.kind === "done") {
      // Final repaint to ensure the last frame is fully applied.
      await renderFrame(wrapper, buffer, exportToSvg, morphdom);
      frames += 1;
      break;
    }
  }

  return { frames, elements: buffer.length };
}

async function* toAsyncIterable<T>(
  src: AsyncIterable<T> | Iterable<T>,
): AsyncIterable<T> {
  if (Symbol.asyncIterator in (src as object)) {
    for await (const v of src as AsyncIterable<T>) yield v;
  } else {
    for (const v of src as Iterable<T>) yield v;
  }
}
