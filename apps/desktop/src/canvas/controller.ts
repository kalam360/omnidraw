/**
 * `CanvasController` implementation backed by an `ExcalidrawImperativeAPI`.
 *
 * Decoupled from the React component so it can be unit-tested with a
 * lightweight mock of the imperative API (no jsdom canvas/render).
 */

import type {
  CanvasController,
  ElementPatch,
  SceneMeta,
} from "../contracts/canvas";
import type { ExcalidrawElement } from "@excalidraw/element/types";

/**
 * Subset of `ExcalidrawImperativeAPI` we depend on. We keep the structural
 * type narrow so tests don't have to satisfy the full upstream interface.
 */
export interface ExcalidrawApiLike {
  updateScene(scene: {
    elements?: readonly ExcalidrawElement[];
    appState?: Record<string, unknown>;
    captureUpdate?: unknown;
  }): void;
  getSceneElements(): readonly ExcalidrawElement[];
  getAppState?(): Record<string, unknown>;
  onChange?(
    cb: (
      elements: readonly ExcalidrawElement[],
      appState: Record<string, unknown>,
      files: unknown,
    ) => void,
  ): () => void;
}

export interface ControllerDeps {
  /** Lazy accessor for the API — the React ref isn't populated until mount. */
  getApi(): ExcalidrawApiLike | null;
  /**
   * Optional hook used by `snapshot()`. Lifted out so tests don't need
   * canvas/DOM. In production it wraps `exportToBlob` from
   * `@excalidraw/excalidraw`.
   */
  exportPng?: (
    elements: readonly ExcalidrawElement[],
    appState: Record<string, unknown>,
  ) => Promise<{ png: Uint8Array; width: number; height: number }>;
}

let sceneCounter = 0;
function nextSceneId(): string {
  sceneCounter += 1;
  return `scene_${Date.now().toString(36)}_${sceneCounter}`;
}

export function createController(deps: ControllerDeps): CanvasController {
  let meta: SceneMeta = {};
  // Subscribers to user-driven scene changes. Wired via `attachOnChange()`.
  const sceneListeners = new Set<(els: ExcalidrawElement[]) => void>();
  let onChangeUnsub: (() => void) | null = null;

  function api(): ExcalidrawApiLike {
    const a = deps.getApi();
    if (!a) {
      throw new Error(
        "OmnidrawCanvas not mounted yet — controller called before initialise.",
      );
    }
    return a;
  }

  function ensureOnChangeAttached(): void {
    if (onChangeUnsub) return;
    const a = deps.getApi();
    if (!a?.onChange) return;
    onChangeUnsub = a.onChange((elements) => {
      const snapshot = [...elements];
      for (const cb of sceneListeners) {
        try {
          cb(snapshot);
        } catch {
          /* listener errors must not break Excalidraw */
        }
      }
    });
  }

  return {
    async setScene(elements, m) {
      meta = m ?? {};
      api().updateScene({ elements });
      return { sceneId: nextSceneId() };
    },

    async addElements(elements) {
      const current = api().getSceneElements();
      const next = [...current, ...elements];
      api().updateScene({ elements: next });
    },

    async updateElements(patches: ElementPatch[]) {
      const byId = new Map(patches.map((p) => [p.id, p] as const));
      const current = api().getSceneElements();
      const next = current.map((el) => {
        const patch = byId.get(el.id);
        if (!patch) return el;
        return { ...el, ...patch } as ExcalidrawElement;
      });
      api().updateScene({ elements: next });
    },

    async removeElements(ids) {
      const drop = new Set(ids);
      const next = api()
        .getSceneElements()
        .filter((el) => !drop.has(el.id));
      api().updateScene({ elements: next });
    },

    async getScene() {
      const elements = [...api().getSceneElements()];
      return { elements, meta };
    },

    async snapshot() {
      const a = api();
      const elements = a.getSceneElements();
      const appState = a.getAppState?.() ?? {};
      if (deps.exportPng) {
        return deps.exportPng(elements, appState);
      }
      // Fallback: a 1x1 transparent PNG so callers always get bytes.
      // Production attaches a real exporter via `exportPng`.
      return { png: new Uint8Array(), width: 0, height: 0 };
    },

    on(event, cb) {
      if (event !== "scene_changed") {
        return () => {
          /* no-op for unknown events */
        };
      }
      sceneListeners.add(cb);
      ensureOnChangeAttached();
      return () => {
        sceneListeners.delete(cb);
        if (sceneListeners.size === 0 && onChangeUnsub) {
          onChangeUnsub();
          onChangeUnsub = null;
        }
      };
    },
  };
}
