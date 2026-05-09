import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  AuthAdapter,
  CanvasController,
  ChatModelAdapter,
  SkillRegistry,
  StorageAdapter,
} from "@/contracts";
import { createAgent } from "@/agent";
import { createBrowserStorage } from "./browser-storage";
import { createDeferredCanvas, type DeferredCanvas } from "./deferred-canvas";

export interface Adapters {
  auth: AuthAdapter;
  canvas: CanvasController;
  /**
   * Same object as `canvas`, but with `attach`/`detach` exposed for the
   * shell `<OmnidrawCanvas/>` wrapper to plug in the real controller
   * via its `onReady` hook.
   */
  canvasDeferred: DeferredCanvas;
  chat: ChatModelAdapter;
  skills: SkillRegistry;
  storage: StorageAdapter;
}

/**
 * Build a real Adapters bundle from the four parallel teams' modules:
 *   - Storage:  in-memory `createBrowserStorage()` for the SPA dev path
 *               (real `@/storage` SQLite adapter requires Node — wired
 *               via Tauri IPC in S10, see `docs/superpowers/specs/...`).
 *   - Canvas:   `@/canvas`'s controller, addressed via a deferred proxy
 *               so the agent can hold a reference before mount.
 *   - Agent:    `@/agent`'s `createAgent()` (chat + skills + auth).
 *
 * Tests can pass `overrides` to swap any individual adapter for a fake.
 */
export function createAdapters(overrides: Partial<Adapters> = {}): Adapters {
  const canvasDeferred =
    overrides.canvasDeferred ?? createDeferredCanvas();

  const agent = createAgent({});
  const storage = overrides.storage ?? createBrowserStorage();

  return {
    auth: overrides.auth ?? agent.auth,
    chat: overrides.chat ?? agent.chat,
    skills: overrides.skills ?? agent.skills,
    storage,
    canvas: overrides.canvas ?? canvasDeferred,
    canvasDeferred,
  };
}

const AdaptersCtx = createContext<Adapters | null>(null);

export function AdaptersProvider({
  value,
  children,
}: {
  value?: Adapters;
  children: ReactNode;
}) {
  // Build once per provider instance.
  const built = useMemo<Adapters>(() => value ?? createAdapters(), [value]);
  return <AdaptersCtx.Provider value={built}>{children}</AdaptersCtx.Provider>;
}

export function useAdapters(): Adapters {
  const ctx = useContext(AdaptersCtx);
  if (!ctx) {
    throw new Error(
      "useAdapters() called outside <AdaptersProvider/>. Wrap your app root.",
    );
  }
  return ctx;
}

export function useAuth() {
  return useAdapters().auth;
}
export function useChat() {
  return useAdapters().chat;
}
export function useStorage() {
  return useAdapters().storage;
}
export function useCanvas() {
  return useAdapters().canvas;
}
export function useDeferredCanvas() {
  return useAdapters().canvasDeferred;
}
export function useSkills() {
  return useAdapters().skills;
}
