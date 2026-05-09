/**
 * Deferred canvas controller.
 *
 * The real `CanvasController` is owned by `<OmnidrawCanvas/>` from `@/canvas`,
 * which lazy-loads Excalidraw. Frontend code (chat tools, agent extension)
 * needs a stable `CanvasController` reference at app start, before the canvas
 * route has even mounted. This proxy holds a mutable inner controller that
 * the canvas component swaps in via its `onReady` hook.
 *
 * If a method is called before mount we throw a clear error — that path is
 * a programming bug (it means the agent tried to draw without a canvas
 * route active). Subscribe (`on`) is the one method we tolerate early; we
 * record listeners and forward them once the real controller arrives.
 */

import type {
  CanvasController,
  ElementPatch,
  SceneMeta,
} from "../../contracts/canvas";
import type { ExcalidrawElement } from "@excalidraw/element/types";

export interface DeferredCanvas extends CanvasController {
  /** Called by `<OmnidrawCanvas/>`'s `onReady` once the real controller mounts. */
  attach(real: CanvasController): void;
  /** Drop the real controller (e.g. on unmount). Listeners are kept so a
   *  subsequent mount re-subscribes them. */
  detach(): void;
}

type SceneListener = (els: ExcalidrawElement[]) => void;

export function createDeferredCanvas(): DeferredCanvas {
  let real: CanvasController | null = null;
  const pendingListeners = new Set<SceneListener>();
  // Map listener → unsubscribe handle, so we can detach cleanly.
  const liveSubs = new Map<SceneListener, () => void>();

  function ensure(): CanvasController {
    if (!real) {
      throw new Error(
        "CanvasController called before <OmnidrawCanvas/> mounted. " +
          "Open a project session route before invoking canvas tools.",
      );
    }
    return real;
  }

  return {
    attach(next) {
      real = next;
      // Wire up any listeners registered before mount.
      for (const cb of pendingListeners) {
        liveSubs.set(cb, next.on("scene_changed", cb));
      }
    },
    detach() {
      // Unsubscribe live subs; keep listeners in pending so a re-mount restores them.
      for (const [cb, off] of liveSubs) {
        off();
        pendingListeners.add(cb);
      }
      liveSubs.clear();
      real = null;
    },

    setScene(elements: ExcalidrawElement[], meta?: SceneMeta) {
      return ensure().setScene(elements, meta);
    },
    addElements(elements: ExcalidrawElement[]) {
      return ensure().addElements(elements);
    },
    updateElements(patches: ElementPatch[]) {
      return ensure().updateElements(patches);
    },
    removeElements(ids: string[]) {
      return ensure().removeElements(ids);
    },
    getScene() {
      return ensure().getScene();
    },
    snapshot() {
      return ensure().snapshot();
    },
    on(event, cb) {
      if (event !== "scene_changed") {
        return () => {};
      }
      if (real) {
        const off = real.on(event, cb);
        liveSubs.set(cb, off);
        return () => {
          off();
          liveSubs.delete(cb);
        };
      }
      // No canvas yet — record and replay on attach.
      pendingListeners.add(cb);
      return () => {
        pendingListeners.delete(cb);
        const off = liveSubs.get(cb);
        if (off) {
          off();
          liveSubs.delete(cb);
        }
      };
    },
  };
}
