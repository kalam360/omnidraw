/**
 * Browser-only `StorageAdapter` implementation.
 *
 * The real `@/storage` adapter is backed by SQLite + the local FS, both
 * Node-only. In the SPA dev path (and pre-Tauri previews) we run inside
 * a browser tab with no FS access — this module provides an in-memory
 * `StorageAdapter` that satisfies the same contract so the rest of the
 * app can be exercised end-to-end.
 *
 * S10 (Tauri) cleanup: this file goes away. Tauri proxies storage calls
 * to a Rust backend that uses `@/storage` directly. Until then, we ship
 * a usefully seeded in-memory store so the UI has something to render.
 */

import type {
  ChatMessage,
  Project,
  Scene,
  SceneRef,
  StorageAdapter,
  Thread,
  ThreadRef,
} from "@/contracts";
import { StorageNotFoundError } from "@/storage/errors";

const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);

interface DB {
  projects: Project[];
  scenesByProject: Map<string, Scene[]>;
  threadsByProject: Map<string, Thread[]>;
  settings: Map<string, unknown>;
}

function seed(): DB {
  const proj: Project = {
    id: "p_seed_1",
    name: "Backprop deep dive",
    description: "Visual explainer for grad school office hours.",
    path: "~/omnidraw/projects/backprop-deep-dive",
    sceneCount: 7,
    threadCount: 1,
    createdAt: now(),
    updatedAt: now(),
  };
  const proj2: Project = {
    id: "p_seed_2",
    name: "Linear Algebra 101",
    description: "Intro lecture diagrams.",
    path: "~/omnidraw/projects/linear-algebra-101",
    sceneCount: 0,
    threadCount: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  const sceneRefs: SceneRef[] = Array.from({ length: 7 }, (_, i) => ({
    id: `s_seed_${i + 1}`,
    title: i === 2 ? "Forward + backward pass" : `Scene ${i + 1}`,
    filename: `scene-${i + 1}.excalidraw`,
    updatedAt: now(),
  }));
  const scenes: Scene[] = sceneRefs.map((s) => ({ ...s, elements: [] }));
  const thread: Thread = {
    id: "t_seed_1",
    title: "Chain rule visual",
    messageCount: 4,
    updatedAt: now(),
    messages: [
      {
        id: "m1",
        role: "user",
        content:
          "Make a 4-step flowchart of backpropagation. Show the loss at the bottom and gradients flowing up.",
        createdAt: now(),
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "I'll start with the forward pass — input, linear layer, activation, and prediction — then place a loss node at the bottom with gradient arrows flowing back up.",
        toolCalls: [
          {
            id: "tc1",
            name: "create_scene",
            args: { title: "Backprop · forward + backward" },
            result: { ok: true, value: { elements: 9 } },
          },
        ],
        createdAt: now(),
      },
      {
        id: "m3",
        role: "user",
        content: "Now create scene 4 — the chain rule expansion.",
        createdAt: now(),
      },
    ],
  };
  return {
    projects: [proj, proj2],
    scenesByProject: new Map([
      [proj.id, scenes],
      [proj2.id, []],
    ]),
    threadsByProject: new Map([
      [proj.id, [thread]],
      [proj2.id, []],
    ]),
    settings: new Map(),
  };
}

export function createBrowserStorage(): StorageAdapter {
  const db: DB = seed();

  return {
    async listProjects() {
      return db.projects;
    },
    async getProject(id) {
      return db.projects.find((p) => p.id === id) ?? null;
    },
    async createProject(input) {
      const proj: Project = {
        id: `p_${rid()}`,
        name: input.name,
        description: input.description,
        path: `~/omnidraw/projects/${input.name.toLowerCase().replace(/\s+/g, "-")}`,
        sceneCount: 0,
        threadCount: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      db.projects = [proj, ...db.projects];
      db.scenesByProject.set(proj.id, []);
      db.threadsByProject.set(proj.id, []);
      return proj;
    },
    async renameProject(id, name) {
      const p = db.projects.find((p) => p.id === id);
      if (!p) throw new StorageNotFoundError("project", id);
      p.name = name;
      p.updatedAt = now();
      return p;
    },
    async deleteProject(id) {
      db.projects = db.projects.filter((p) => p.id !== id);
      db.scenesByProject.delete(id);
      db.threadsByProject.delete(id);
    },
    async listScenes(projectId) {
      return db.scenesByProject.get(projectId) ?? [];
    },
    async getScene(projectId, sceneId) {
      const s = db.scenesByProject
        .get(projectId)
        ?.find((s) => s.id === sceneId);
      if (!s) throw new StorageNotFoundError("scene", sceneId);
      return s;
    },
    async saveScene(projectId, scene) {
      const arr = db.scenesByProject.get(projectId) ?? [];
      const idx = arr.findIndex((s) => s.id === scene.id);
      if (idx >= 0) arr[idx] = scene;
      else arr.push(scene);
      db.scenesByProject.set(projectId, arr);
      return scene;
    },
    async deleteScene(projectId, sceneId) {
      const arr = db.scenesByProject.get(projectId) ?? [];
      db.scenesByProject.set(
        projectId,
        arr.filter((s) => s.id !== sceneId),
      );
    },
    async listThreads(projectId) {
      return (db.threadsByProject.get(projectId) ?? []).map<ThreadRef>((t) => ({
        id: t.id,
        title: t.title,
        messageCount: t.messageCount,
        updatedAt: t.updatedAt,
      }));
    },
    async getThread(threadId) {
      for (const list of db.threadsByProject.values()) {
        const t = list.find((t) => t.id === threadId);
        if (t) return t;
      }
      throw new StorageNotFoundError("thread", threadId);
    },
    async appendMessage(threadId, msg: ChatMessage) {
      for (const list of db.threadsByProject.values()) {
        const t = list.find((t) => t.id === threadId);
        if (t) {
          t.messages.push(msg);
          t.messageCount = t.messages.length;
          t.updatedAt = now();
          return;
        }
      }
    },
    async createThread(projectId, input) {
      const t: Thread = {
        id: `t_${rid()}`,
        title: input.title ?? "New thread",
        messageCount: 0,
        updatedAt: now(),
        messages: [],
      };
      const arr = db.threadsByProject.get(projectId) ?? [];
      arr.unshift(t);
      db.threadsByProject.set(projectId, arr);
      return {
        id: t.id,
        title: t.title,
        messageCount: 0,
        updatedAt: t.updatedAt,
      };
    },
    async deleteThread(threadId) {
      for (const [k, list] of db.threadsByProject) {
        db.threadsByProject.set(
          k,
          list.filter((t) => t.id !== threadId),
        );
      }
    },
    async getSetting<T = unknown>(key: string): Promise<T | null> {
      return (db.settings.get(key) as T) ?? null;
    },
    async setSetting<T = unknown>(key: string, value: T): Promise<void> {
      db.settings.set(key, value);
    },
  };
}
