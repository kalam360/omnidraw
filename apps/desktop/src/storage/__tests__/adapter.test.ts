import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { existsSync } from "node:fs";

import { createStorage } from "../index.js";
import { makeTestStorage, type TestEnv } from "./helpers.js";

describe("StorageAdapter — happy paths", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = makeTestStorage();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("creates and lists projects", async () => {
    const a = await env.storage.createProject({ name: "Alpha" });
    const b = await env.storage.createProject({
      name: "Bravo",
      description: "second",
    });
    const list = await env.storage.listProjects();

    expect(list).toHaveLength(2);
    expect(list.map((p) => p.name).sort()).toEqual(["Alpha", "Bravo"]);
    expect(existsSync(a.path)).toBe(true);
    expect(existsSync(path.join(b.path, "project.json"))).toBe(true);
    expect(b.description).toBe("second");
  });

  it("getProject returns null for unknown id", async () => {
    expect(await env.storage.getProject("does-not-exist")).toBeNull();
  });

  it("renameProject updates the name and bumps updated_at", async () => {
    const p = await env.storage.createProject({ name: "Old" });
    const renamed = await env.storage.renameProject(p.id, "New");
    expect(renamed.name).toBe("New");
    const fetched = await env.storage.getProject(p.id);
    expect(fetched?.name).toBe("New");
  });

  it("deleteProject removes folder + cascades scenes & threads", async () => {
    const p = await env.storage.createProject({ name: "Doomed" });
    await env.storage.saveScene(p.id, {
      id: "",
      title: "S",
      filename: "",
      updatedAt: "",
      elements: [],
    });
    await env.storage.createThread(p.id, { title: "T" });

    await env.storage.deleteProject(p.id);
    expect(existsSync(p.path)).toBe(false);
    expect(await env.storage.getProject(p.id)).toBeNull();
    expect(await env.storage.listThreads(p.id)).toEqual([]);
  });

  it("saveScene + getScene round-trips elements and appState", async () => {
    const p = await env.storage.createProject({ name: "P" });
    const ref = await env.storage.saveScene(p.id, {
      id: "",
      title: "Diagram",
      filename: "",
      updatedAt: "",
      elements: [
        // shape compatible with ExcalidrawElement minimums; cast away strict typing
        { id: "el1", type: "rectangle", x: 1, y: 2 } as never,
      ],
      appState: { viewBackgroundColor: "#fff" },
    });

    const scene = await env.storage.getScene(p.id, ref.id);
    expect(scene.title).toBe("Diagram");
    expect(scene.elements).toHaveLength(1);
    expect(scene.appState?.viewBackgroundColor).toBe("#fff");

    const list = await env.storage.listScenes(p.id);
    expect(list.map((s) => s.id)).toContain(ref.id);
  });

  it("saveScene with same id overwrites file content", async () => {
    const p = await env.storage.createProject({ name: "P" });
    const first = await env.storage.saveScene(p.id, {
      id: "",
      title: "v1",
      filename: "",
      updatedAt: "",
      elements: [{ id: "a", type: "rectangle" } as never],
    });
    const second = await env.storage.saveScene(p.id, {
      id: first.id,
      title: "v2",
      filename: "",
      updatedAt: "",
      elements: [{ id: "b", type: "ellipse" } as never],
    });
    expect(second.id).toBe(first.id);
    const scene = await env.storage.getScene(p.id, first.id);
    expect(scene.title).toBe("v2");
    expect((scene.elements[0] as { id: string }).id).toBe("b");
  });

  it("deleteScene removes file and row", async () => {
    const p = await env.storage.createProject({ name: "P" });
    const ref = await env.storage.saveScene(p.id, {
      id: "",
      title: "x",
      filename: "",
      updatedAt: "",
      elements: [],
    });
    await env.storage.deleteScene(p.id, ref.id);
    const list = await env.storage.listScenes(p.id);
    expect(list).toEqual([]);
    expect(existsSync(path.join((await env.storage.getProject(p.id))!.path, "scenes", ref.filename))).toBe(false);
  });

  it("threads + appendMessage update message count and order", async () => {
    const p = await env.storage.createProject({ name: "P" });
    const t = await env.storage.createThread(p.id, { title: "Chat" });

    await env.storage.appendMessage(t.id, {
      id: "m1",
      role: "user",
      content: "hello",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await env.storage.appendMessage(t.id, {
      id: "m2",
      role: "assistant",
      content: "hi",
      toolCalls: [{ id: "tc1", name: "noop", args: {} }],
      createdAt: "2026-01-01T00:00:01.000Z",
    });

    const thread = await env.storage.getThread(t.id);
    expect(thread.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(thread.messages[1].toolCalls?.[0].name).toBe("noop");
    expect(thread.messageCount).toBe(2);

    const list = await env.storage.listThreads(p.id);
    expect(list[0].messageCount).toBe(2);
  });

  it("settings get/set round-trip", async () => {
    await env.storage.setSetting("workspace_root", { foo: "bar" });
    const got = await env.storage.getSetting<{ foo: string }>("workspace_root");
    expect(got).toEqual({ foo: "bar" });
    expect(await env.storage.getSetting("missing")).toBeNull();
  });

  it("round-trips across instance restarts", async () => {
    const p = await env.storage.createProject({ name: "Persist" });
    const scene = await env.storage.saveScene(p.id, {
      id: "",
      title: "keep",
      filename: "",
      updatedAt: "",
      elements: [{ id: "z", type: "rectangle" } as never],
    });
    env.storage.close();

    const reopened = createStorage({ rootPath: env.rootPath });
    try {
      const list = await reopened.listProjects();
      expect(list.map((p) => p.name)).toContain("Persist");
      const fetched = await reopened.getScene(p.id, scene.id);
      expect(fetched.title).toBe("keep");
      expect((fetched.elements[0] as { id: string }).id).toBe("z");
    } finally {
      reopened.close();
    }
  });
});
