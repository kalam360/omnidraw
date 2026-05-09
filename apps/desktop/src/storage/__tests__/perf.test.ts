import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";

import { makeTestStorage } from "./helpers.js";

/**
 * Lightweight perf sanity checks. Not a precise benchmark — they assert
 * loose upper bounds so flaky CI hardware doesn't fail us, but the
 * console output gives us numbers worth quoting in PR descriptions.
 */
describe("perf", () => {
  it("appendMessage hot path is fast", async () => {
    const env = makeTestStorage();
    try {
      const project = await env.storage.createProject({ name: "Bench" });
      const thread = await env.storage.createThread(project.id, {
        title: "B",
      });

      // warmup
      for (let i = 0; i < 50; i++) {
        await env.storage.appendMessage(thread.id, {
          id: `w${i}`,
          role: "user",
          content: "warm",
          createdAt: new Date().toISOString(),
        });
      }

      const N = 1000;
      const start = performance.now();
      for (let i = 0; i < N; i++) {
        await env.storage.appendMessage(thread.id, {
          id: `m${i}`,
          role: "user",
          content: "hello world",
          createdAt: new Date().toISOString(),
        });
      }
      const elapsed = performance.now() - start;
      const perOp = elapsed / N;
      // eslint-disable-next-line no-console
      console.log(
        `appendMessage: ${perOp.toFixed(3)} ms/op (${N} ops in ${elapsed.toFixed(1)} ms)`,
      );
      expect(perOp).toBeLessThan(5); // generous; native sqlite is sub-ms.
    } finally {
      env.cleanup();
    }
  });

  it("listScenes scales linearly with a few hundred scenes", async () => {
    const env = makeTestStorage();
    try {
      const project = await env.storage.createProject({ name: "B" });
      for (let i = 0; i < 200; i++) {
        await env.storage.saveScene(project.id, {
          id: "",
          title: `s${i}`,
          filename: "",
          updatedAt: "",
          elements: [{ id: `e${i}`, type: "rectangle" } as never],
        });
      }
      const start = performance.now();
      const list = await env.storage.listScenes(project.id);
      const elapsed = performance.now() - start;
      // eslint-disable-next-line no-console
      console.log(
        `listScenes(200): ${elapsed.toFixed(2)} ms (${list.length} rows)`,
      );
      expect(list).toHaveLength(200);
      expect(elapsed).toBeLessThan(50);
    } finally {
      env.cleanup();
    }
  });
});
