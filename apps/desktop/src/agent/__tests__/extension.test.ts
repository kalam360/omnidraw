import { describe, expect, it, vi } from "vitest";

import {
  createOmnidrawTools,
  OMNIDRAW_TOOL_NAMES,
} from "../extension";
import type { CanvasController, ElementPatch, SceneMeta } from "../../contracts/canvas";
import type { ExcalidrawElement } from "@excalidraw/element/types";

function stubCanvas() {
  const setScene = vi.fn(async (els: ExcalidrawElement[], _meta?: SceneMeta) => ({
    sceneId: `scene-${els.length}`,
  }));
  const addElements = vi.fn(async (_els: ExcalidrawElement[]) => {});
  const updateElements = vi.fn(async (_p: ElementPatch[]) => {});
  const removeElements = vi.fn(async (_ids: string[]) => {});
  const getScene = vi.fn(async () => ({
    elements: [{ id: "e1" }, { id: "e2" }] as unknown as ExcalidrawElement[],
    meta: { title: "demo" } as SceneMeta,
  }));
  const snapshot = vi.fn(async () => ({
    png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    width: 100,
    height: 50,
  }));
  const on = vi.fn(() => () => {});

  const canvas: CanvasController = {
    setScene,
    addElements,
    updateElements,
    removeElements,
    getScene,
    snapshot,
    on,
  };
  return {
    canvas,
    spies: {
      setScene,
      addElements,
      updateElements,
      removeElements,
      getScene,
      snapshot,
    },
  };
}

describe("omnidraw extension tools", () => {
  it("registers exactly the six canvas tools", () => {
    const { canvas } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    expect(tools.map((t) => t.name).sort()).toEqual(
      [...OMNIDRAW_TOOL_NAMES].sort(),
    );
    for (const t of tools) {
      expect(t.label).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.parameters).toBeTruthy(); // typebox schema
    }
  });

  it("create_scene calls setScene with the elements + title meta", async () => {
    const { canvas, spies } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    const tool = tools.find((t) => t.name === "create_scene")!;

    const elements = [
      { id: "a", type: "rectangle" },
      { id: "b", type: "text" },
    ];
    const result = await tool.execute(
      "call-1",
      { title: "My diagram", elements } as never,
    );

    expect(spies.setScene).toHaveBeenCalledTimes(1);
    expect(spies.setScene).toHaveBeenCalledWith(elements, {
      title: "My diagram",
    });
    expect((result.details as { sceneId: string }).sceneId).toBe("scene-2");
    expect(result.content[0]).toMatchObject({ type: "text" });
  });

  it("update_elements forwards patches verbatim", async () => {
    const { canvas, spies } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    const tool = tools.find((t) => t.name === "update_elements")!;
    await tool.execute(
      "call-2",
      { patches: [{ id: "e1", x: 10 }, { id: "e2", strokeColor: "#abc" }] } as never,
    );
    expect(spies.updateElements).toHaveBeenCalledWith([
      { id: "e1", x: 10 },
      { id: "e2", strokeColor: "#abc" },
    ]);
  });

  it("remove_elements forwards ids", async () => {
    const { canvas, spies } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    const tool = tools.find((t) => t.name === "remove_elements")!;
    await tool.execute("call-3", { ids: ["x", "y"] } as never);
    expect(spies.removeElements).toHaveBeenCalledWith(["x", "y"]);
  });

  it("get_scene returns elements + meta in details", async () => {
    const { canvas } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    const tool = tools.find((t) => t.name === "get_scene")!;
    const result = await tool.execute("call-4", {} as never);
    expect((result.details as { elements: unknown[] }).elements).toHaveLength(2);
    expect((result.details as { meta: SceneMeta }).meta.title).toBe("demo");
  });

  it("snapshot_scene returns base64 png in details + image content", async () => {
    const { canvas } = stubCanvas();
    const tools = createOmnidrawTools({ canvas });
    const tool = tools.find((t) => t.name === "snapshot_scene")!;
    const result = await tool.execute("call-5", {} as never);
    expect(result.content[0].type).toBe("image");
    const details = result.details as {
      pngBase64: string;
      width: number;
      height: number;
    };
    expect(details.width).toBe(100);
    expect(details.height).toBe(50);
    // base64 of \x89PNG
    expect(details.pngBase64).toBe("iVBORw==");
  });
});
