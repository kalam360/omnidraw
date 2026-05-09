import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

import { makeTestStorage, type TestEnv } from "./helpers.js";

describe("concurrency", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = makeTestStorage();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("100 parallel saveScene calls on the same id leave a valid file and no stray .tmp", async () => {
    const project = await env.storage.createProject({ name: "Race" });

    const sceneId = (
      await env.storage.saveScene(project.id, {
        id: "",
        title: "init",
        filename: "",
        updatedAt: "",
        elements: [],
      })
    ).id;

    await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        env.storage.saveScene(project.id, {
          id: sceneId,
          title: `v${i}`,
          filename: "",
          updatedAt: "",
          elements: [{ id: `e${i}`, type: "rectangle" } as never],
        }),
      ),
    );

    const fetched = await env.storage.getScene(project.id, sceneId);
    expect(fetched.title).toMatch(/^v\d+$/);
    const raw = await readFile(
      path.join(project.path, "scenes", `${sceneId}.excalidraw`),
      "utf8",
    );
    // Must be valid JSON — no half-written torn writes.
    expect(() => JSON.parse(raw)).not.toThrow();

    const sceneFiles = await readdir(path.join(project.path, "scenes"));
    expect(sceneFiles.some((f) => f.includes(".tmp"))).toBe(false);
  });

  it("appendMessage from many parallel callers preserves count", async () => {
    const project = await env.storage.createProject({ name: "Chat" });
    const thread = await env.storage.createThread(project.id, { title: "T" });

    const N = 50;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        env.storage.appendMessage(thread.id, {
          id: `m-${i}`,
          role: "user",
          content: String(i),
          createdAt: new Date(2026, 0, 1, 0, 0, 0, i).toISOString(),
        }),
      ),
    );

    const t = await env.storage.getThread(thread.id);
    expect(t.messageCount).toBe(N);
    expect(t.messages).toHaveLength(N);
  });
});
