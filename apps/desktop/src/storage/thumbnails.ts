import type { Scene } from "../contracts/storage.js";

/**
 * Thumbnail generation.
 *
 * v1 punt: `@excalidraw/excalidraw`'s `exportToBlob` requires a DOM
 * environment (canvas, document) which we don't have inside the Node
 * sidecar. The Canvas team will produce thumbnails from the live
 * renderer in Segment 5 and call back into storage to attach them.
 *
 * Until then we return `null` so the column is consistently empty
 * rather than half-populated.
 */
export async function generateThumbnail(_scene: Scene): Promise<string | null> {
  return null;
}
