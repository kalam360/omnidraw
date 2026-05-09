/**
 * Unit tests for the morphdom-based replay loop.
 *
 * `exportToSvg` and `morphdom` are mocked so the test stays small and
 * deterministic. We verify:
 *   - A 3-element stream plays end-to-end without error.
 *   - Each element triggers a render (frame count == elements + done).
 *   - Element ids are preserved in DOM order.
 *   - A 30+ element stream stays under a generous wall-clock budget.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import {
  play,
  renderFrame,
  type ExportToSvgFn,
  type MorphdomFn,
  type ReplayEvent,
} from "../replay";

function el(id: string): ExcalidrawElement {
  return {
    id,
    type: "rectangle",
    x: 0,
    y: 0,
    width: 80,
    height: 50,
  } as unknown as ExcalidrawElement;
}

/**
 * Build a fake `exportToSvg` that returns a real <svg> with one <rect> per
 * element, using xmlns so jsdom keeps it as an SVG element.
 */
function makeFakeExporter(): {
  exportToSvg: ExportToSvgFn;
  callCount: () => number;
} {
  let calls = 0;
  const fn: ExportToSvgFn = async ({ elements }) => {
    calls += 1;
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svg.setAttribute("data-frame", String(calls));
    for (const e of elements) {
      const r = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      r.setAttribute("data-id", e.id);
      svg.appendChild(r);
    }
    return svg as unknown as SVGSVGElement;
  };
  return { exportToSvg: fn, callCount: () => calls };
}

/**
 * Trivial morphdom replacement: replace `from` with `to` in its parent.
 * Faithful to morphdom's intent for our diff use-case (full SVG swap).
 */
const morphdom: MorphdomFn = (from, to) => {
  const node = typeof to === "string" ? document.createTextNode(to) : to;
  if (from.parentNode) from.parentNode.replaceChild(node, from);
  return node;
};

async function* eventStream(els: ExcalidrawElement[]): AsyncIterable<ReplayEvent> {
  for (const e of els) yield { kind: "element", element: e };
  yield { kind: "done" };
}

describe("renderFrame", () => {
  let wrapper: HTMLDivElement;
  beforeEach(() => {
    wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
  });

  it("appends an svg on first call, morphs on subsequent calls", async () => {
    const { exportToSvg, callCount } = makeFakeExporter();
    await renderFrame(wrapper, [el("a")], exportToSvg, morphdom);
    expect(wrapper.querySelectorAll("svg")).toHaveLength(1);
    expect(wrapper.querySelectorAll("svg > rect")).toHaveLength(1);

    await renderFrame(wrapper, [el("a"), el("b")], exportToSvg, morphdom);
    expect(callCount()).toBe(2);
    expect(wrapper.querySelectorAll("svg > rect")).toHaveLength(2);
    const ids = Array.from(wrapper.querySelectorAll("svg > rect")).map((n) =>
      (n as Element).getAttribute("data-id"),
    );
    expect(ids).toEqual(["a", "b"]);
  });

  it("clears the wrapper for an empty element list", async () => {
    const { exportToSvg } = makeFakeExporter();
    await renderFrame(wrapper, [el("a")], exportToSvg, morphdom);
    expect(wrapper.children.length).toBe(1);
    await renderFrame(wrapper, [], exportToSvg, morphdom);
    expect(wrapper.children.length).toBe(0);
  });
});

describe("play()", () => {
  let wrapper: HTMLDivElement;
  beforeEach(() => {
    wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
  });

  it("plays a 3-element stream end-to-end", async () => {
    const { exportToSvg, callCount } = makeFakeExporter();
    const result = await play(
      wrapper,
      eventStream([el("a"), el("b"), el("c")]),
      exportToSvg,
      morphdom,
      { elementDelayMs: 0 },
    );

    expect(result.elements).toBe(3);
    // 3 element frames + 1 final done-frame
    expect(callCount()).toBe(4);
    expect(result.frames).toBe(4);
    const ids = Array.from(wrapper.querySelectorAll("svg > rect")).map((n) =>
      (n as Element).getAttribute("data-id"),
    );
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("handles 30+ elements without hitches under a generous budget", async () => {
    const elements = Array.from({ length: 30 }, (_, i) => el(`el_${i}`));
    const { exportToSvg } = makeFakeExporter();
    const start = performance.now();
    const result = await play(
      wrapper,
      eventStream(elements),
      exportToSvg,
      morphdom,
      { elementDelayMs: 0 }, // pacing is independent of correctness
    );
    const took = performance.now() - start;

    expect(result.elements).toBe(30);
    expect(wrapper.querySelectorAll("svg > rect").length).toBe(30);
    // Generous: even with morphdom mocked, jsdom adds overhead.
    // Real concern is "no quadratic blow-up", not absolute speed.
    expect(took).toBeLessThan(2000);
  });

  it("supports cancellation via AbortSignal", async () => {
    const { exportToSvg } = makeFakeExporter();
    const ctrl = new AbortController();
    const stream = (async function* () {
      yield { kind: "element", element: el("a") } as ReplayEvent;
      ctrl.abort();
      yield { kind: "element", element: el("b") } as ReplayEvent;
      yield { kind: "done" } as ReplayEvent;
    })();
    const result = await play(wrapper, stream, exportToSvg, morphdom, {
      elementDelayMs: 0,
      signal: ctrl.signal,
    });
    expect(result.elements).toBe(1);
  });
});
