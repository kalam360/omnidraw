/**
 * Omnidraw Pi extension — registers canvas tools that the agent can
 * call. Tools delegate to a `CanvasController` that the Frontend team
 * supplies (typically from the `OmnidrawCanvas` ref).
 *
 * Pi's `pi-coding-agent` runtime exposes `pi.registerTool({...})`
 * out-of-process, but the headless `pi-agent-core` runtime takes
 * tools as plain `AgentTool[]` on `state.tools`. We expose a
 * factory that returns the tool array directly — see
 * `createOmnidrawTools(canvas)`.
 */

import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type Static } from "@earendil-works/pi-ai";

import type { CanvasController, ElementPatch } from "../contracts/canvas";
import type { ExcalidrawElement } from "@excalidraw/element/types";

// -- Schemas (TypeBox) ------------------------------------------------------

/**
 * The agent passes Excalidraw elements as JSON. We don't want to mirror
 * Excalidraw's full ~30-field schema in the tool args — the LLM will
 * fail validation on every call. So we accept `Type.Any()` and trust the
 * canvas controller to validate / coerce. The controller is the
 * authoritative shape-checker.
 */
const ElementsArg = Type.Array(Type.Any());
const PatchesArg = Type.Array(
  Type.Object({
    id: Type.String(),
  }),
  // additional fields are allowed; TypeBox `additionalProperties: true`
  // by default with `Type.Object`.
);

const CreateSceneArgs = Type.Object({
  title: Type.Optional(Type.String()),
  elements: ElementsArg,
});
const AddElementsArgs = Type.Object({ elements: ElementsArg });
const UpdateElementsArgs = Type.Object({ patches: PatchesArg });
const RemoveElementsArgs = Type.Object({ ids: Type.Array(Type.String()) });
const GetSceneArgs = Type.Object({});
const SnapshotSceneArgs = Type.Object({});

// -- Helpers ----------------------------------------------------------------

const txt = (text: string) => ({ type: "text" as const, text });

const ok = <T,>(text: string, details: T): AgentToolResult<T> => ({
  content: [txt(text)],
  details,
});

function toBase64(bytes: Uint8Array): string {
  // Browser path
  if (typeof btoa === "function") {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  // Node path (vitest, Tauri sidecars)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const B = (globalThis as { Buffer?: { from(arr: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(bytes).toString("base64");
  throw new Error("No base64 encoder available");
}

// -- Tool factory -----------------------------------------------------------

export interface OmnidrawToolsOptions {
  canvas: CanvasController;
}

/** Build the canvas-tool array for Pi. */
export function createOmnidrawTools(opts: OmnidrawToolsOptions): AgentTool[] {
  const { canvas } = opts;

  const createScene: AgentTool<typeof CreateSceneArgs> = {
    name: "create_scene",
    label: "Create scene",
    description:
      "Replace the current canvas with a new scene built from the provided Excalidraw elements. Use this to start a fresh diagram.",
    parameters: CreateSceneArgs,
    execute: async (_id, params) => {
      const elements = params.elements as ExcalidrawElement[];
      const { sceneId } = await canvas.setScene(elements, {
        title: params.title,
      });
      return ok(
        `Created scene with ${elements.length} element(s).`,
        { sceneId, count: elements.length },
      );
    },
  };

  const addElements: AgentTool<typeof AddElementsArgs> = {
    name: "add_elements",
    label: "Add elements",
    description:
      "Append the given Excalidraw elements to the current scene without removing existing ones.",
    parameters: AddElementsArgs,
    execute: async (_id, params) => {
      const elements = params.elements as ExcalidrawElement[];
      await canvas.addElements(elements);
      return ok(`Added ${elements.length} element(s).`, {
        count: elements.length,
      });
    },
  };

  const updateElements: AgentTool<typeof UpdateElementsArgs> = {
    name: "update_elements",
    label: "Update elements",
    description:
      "Patch existing elements by id. Each patch must include an `id` plus any partial Excalidraw element fields to update.",
    parameters: UpdateElementsArgs,
    execute: async (_id, params) => {
      // Cast through `unknown` because TypeBox's `additionalProperties` is
      // not reflected in the inferred Static<> type.
      const patches = params.patches as unknown as ElementPatch[];
      await canvas.updateElements(patches);
      return ok(`Updated ${patches.length} element(s).`, {
        count: patches.length,
      });
    },
  };

  const removeElements: AgentTool<typeof RemoveElementsArgs> = {
    name: "remove_elements",
    label: "Remove elements",
    description: "Delete elements from the current scene by id.",
    parameters: RemoveElementsArgs,
    execute: async (_id, params) => {
      await canvas.removeElements(params.ids);
      return ok(`Removed ${params.ids.length} element(s).`, {
        count: params.ids.length,
      });
    },
  };

  const getScene: AgentTool<typeof GetSceneArgs> = {
    name: "get_scene",
    label: "Read current scene",
    description:
      "Return the current canvas state — element list and metadata. Use this before refining a scene the user already drew.",
    parameters: GetSceneArgs,
    execute: async () => {
      const { elements, meta } = await canvas.getScene();
      return ok(
        `Current scene has ${elements.length} element(s).`,
        { elements, meta },
      );
    },
  };

  const snapshotScene: AgentTool<typeof SnapshotSceneArgs> = {
    name: "snapshot_scene",
    label: "Snapshot scene",
    description:
      "Render the current scene to a PNG and return it base64-encoded. Use this when you need to visually reason about layout (e.g. 'is this overlapping?').",
    parameters: SnapshotSceneArgs,
    execute: async () => {
      const { png, width, height } = await canvas.snapshot();
      const pngBase64 = toBase64(png);
      return {
        content: [
          {
            type: "image" as const,
            data: pngBase64,
            mimeType: "image/png",
          },
        ],
        details: { pngBase64, width, height },
      };
    },
  };

  return [
    createScene as unknown as AgentTool,
    addElements as unknown as AgentTool,
    updateElements as unknown as AgentTool,
    removeElements as unknown as AgentTool,
    getScene as unknown as AgentTool,
    snapshotScene as unknown as AgentTool,
  ];
}

// Re-export the tool name list for tests / Frontend.
export const OMNIDRAW_TOOL_NAMES = [
  "create_scene",
  "add_elements",
  "update_elements",
  "remove_elements",
  "get_scene",
  "snapshot_scene",
] as const;

export type OmnidrawToolName = (typeof OMNIDRAW_TOOL_NAMES)[number];

// Helper for tests that want to assert against the args inferred type.
export type CreateSceneArgsT = Static<typeof CreateSceneArgs>;
export type UpdateElementsArgsT = Static<typeof UpdateElementsArgs>;
