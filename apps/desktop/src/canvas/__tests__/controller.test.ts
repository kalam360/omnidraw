/**
 * Unit tests for the Canvas controller.
 *
 * The controller is decoupled from the React component, so we exercise it
 * against a hand-rolled mock of the imperative API. No jsdom canvas, no
 * Excalidraw render — these tests stay fast (<10ms) and reliable.
 */

import { describe, it, expect } from "vitest";
import { createController, type ExcalidrawApiLike } from "../controller";
import type { ExcalidrawElement } from "@excalidraw/element/types";

function makeApi(): {
  api: ExcalidrawApiLike;
  state: { elements: ExcalidrawElement[]; appState: Record<string, unknown> };
  triggerChange: (els: ExcalidrawElement[]) => void;
} {
  let listeners: Array<
    (els: readonly ExcalidrawElement[], app: Record<string, unknown>, files: unknown) => void
  > = [];
  const state = {
    elements: [] as ExcalidrawElement[],
    appState: {} as Record<string, unknown>,
  };
  const api: ExcalidrawApiLike = {
    updateScene({ elements, appState }) {
      if (elements) state.elements = [...elements];
      if (appState) state.appState = { ...state.appState, ...appState };
    },
    getSceneElements() {
      return state.elements;
    },
    getAppState() {
      return state.appState;
    },
    onChange(cb) {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    },
  };
  return {
    api,
    state,
    triggerChange(els) {
      for (const l of listeners) l(els, state.appState, null);
    },
  };
}

function el(id: string, x = 0, y = 0): ExcalidrawElement {
  return { id, type: "rectangle", x, y, width: 100, height: 80 } as unknown as ExcalidrawElement;
}

describe("CanvasController", () => {
  it("setScene + getScene round-trips elements faithfully", async () => {
    const { api, state } = makeApi();
    const ctrl = createController({ getApi: () => api });

    const elements = [el("a"), el("b", 50, 50), el("c", 200, 100)];
    const { sceneId } = await ctrl.setScene(elements, { title: "round-trip" });
    expect(sceneId).toMatch(/^scene_/);

    expect(state.elements).toEqual(elements);

    const got = await ctrl.getScene();
    expect(got.elements).toEqual(elements);
    expect(got.meta.title).toBe("round-trip");
  });

  it("addElements appends to the current scene", async () => {
    const { api } = makeApi();
    const ctrl = createController({ getApi: () => api });
    await ctrl.setScene([el("a")]);
    await ctrl.addElements([el("b"), el("c")]);
    const { elements } = await ctrl.getScene();
    expect(elements.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("updateElements patches matching ids only", async () => {
    const { api } = makeApi();
    const ctrl = createController({ getApi: () => api });
    await ctrl.setScene([el("a", 0, 0), el("b", 0, 0)]);
    await ctrl.updateElements([{ id: "a", x: 999 } as never]);
    const { elements } = await ctrl.getScene();
    expect(elements[0].x).toBe(999);
    expect(elements[1].x).toBe(0);
  });

  it("removeElements drops by id", async () => {
    const { api } = makeApi();
    const ctrl = createController({ getApi: () => api });
    await ctrl.setScene([el("a"), el("b"), el("c")]);
    await ctrl.removeElements(["b"]);
    const { elements } = await ctrl.getScene();
    expect(elements.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("on('scene_changed') is invoked on Excalidraw onChange", async () => {
    const { api, triggerChange } = makeApi();
    const ctrl = createController({ getApi: () => api });
    const seen: string[][] = [];
    const off = ctrl.on("scene_changed", (els) => {
      seen.push(els.map((e) => e.id));
    });
    triggerChange([el("a"), el("b")]);
    triggerChange([el("a")]);
    expect(seen).toEqual([["a", "b"], ["a"]]);
    off();
    triggerChange([el("z")]);
    expect(seen).toHaveLength(2);
  });

  it("snapshot() returns null bytes without an exporter", async () => {
    const { api } = makeApi();
    const ctrl = createController({ getApi: () => api });
    const snap = await ctrl.snapshot();
    expect(snap.png).toBeNull();
    expect(snap.width).toBe(0);
    expect(snap.height).toBe(0);
  });

  it("snapshot() delegates to a custom exportPng hook", async () => {
    const { api } = makeApi();
    const ctrl = createController({
      getApi: () => api,
      exportPng: async () => ({
        png: new Uint8Array([1, 2, 3]),
        width: 320,
        height: 200,
      }),
    });
    await ctrl.setScene([el("a")]);
    const snap = await ctrl.snapshot();
    expect(snap.width).toBe(320);
    expect(snap.png?.byteLength).toBe(3);
  });

  it("throws a useful error when called before mount", async () => {
    const ctrl = createController({ getApi: () => null });
    await expect(ctrl.getScene()).rejects.toThrow(/not mounted/);
  });
});
