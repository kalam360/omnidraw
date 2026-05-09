// NOTE: Spec specifies "@excalidraw/excalidraw/types/element/types", but in
// this workspace the public type lives in @excalidraw/element (its source
// is what excalidraw re-exports). Using the workspace package directly.
import type { ExcalidrawElement } from "@excalidraw/element/types";

/** Implemented by the Canvas team. Consumed by Agent + Frontend. */
export interface CanvasController {
  /** Replace the entire scene with the given elements. Returns scene id. */
  setScene(elements: ExcalidrawElement[], meta?: SceneMeta): Promise<{ sceneId: string }>;

  /** Append elements to the current scene. */
  addElements(elements: ExcalidrawElement[]): Promise<void>;

  /** Patch existing elements. Each patch is { id, ...partial }. */
  updateElements(patches: ElementPatch[]): Promise<void>;

  /** Remove elements by id. */
  removeElements(ids: string[]): Promise<void>;

  /** Read the current scene (for refine-skill use). */
  getScene(): Promise<{ elements: ExcalidrawElement[]; meta: SceneMeta }>;

  /** PNG snapshot for a "what does it look like now?" tool. */
  snapshot(): Promise<{ png: Uint8Array; width: number; height: number }>;

  /** Subscribe to user-driven canvas changes. */
  on(event: "scene_changed", cb: (elements: ExcalidrawElement[]) => void): () => void;
}

export type ElementPatch = { id: string } & Partial<ExcalidrawElement>;

export interface SceneMeta {
  title?: string;
  threadId?: string;
}
