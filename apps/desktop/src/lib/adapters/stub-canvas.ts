import type { CanvasController, ElementPatch, SceneMeta } from "@/contracts";
import type { ExcalidrawElement } from "@excalidraw/element/types";

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.debug("[stub-canvas]", ...args);
};

let listeners = new Set<(els: ExcalidrawElement[]) => void>();
let elements: ExcalidrawElement[] = [];
let meta: SceneMeta = {};

export const stubCanvasController: CanvasController = {
  async setScene(els, m) {
    log("setScene", els.length, m);
    elements = els;
    meta = m ?? {};
    return { sceneId: `scene_${Math.random().toString(36).slice(2, 8)}` };
  },
  async addElements(els) {
    log("addElements", els.length);
    elements = [...elements, ...els];
  },
  async updateElements(patches: ElementPatch[]) {
    log("updateElements", patches.length);
  },
  async removeElements(ids) {
    log("removeElements", ids);
    elements = elements.filter((e) => !ids.includes(e.id));
  },
  async getScene() {
    return { elements, meta };
  },
  async snapshot() {
    log("snapshot");
    return { png: new Uint8Array(0), width: 800, height: 600 };
  },
  on(_event, cb) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
