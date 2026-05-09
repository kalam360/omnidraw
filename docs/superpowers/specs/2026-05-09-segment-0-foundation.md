# Segment 0 — Foundation

**Date**: 2026-05-09
**Owner**: single foundation agent (run in isolated worktree)
**Branch**: `feat/omnidraw-foundation` off `feat/omnidraw-design-baseline`
**Output**: a branded Vite SPA + interface contracts the four parallel teams consume

## Goal

Establish the repo skeleton + interface contracts so four parallel teams
(Frontend, Agent, Canvas, Storage) can work in isolated worktrees
without stepping on each other.

## Tasks

### 1. Package manager migration (yarn 1.22 → pnpm)

- Add `packageManager: "pnpm@<latest>"` to root `package.json`.
- Replace `yarn.lock` with a freshly-generated `pnpm-lock.yaml` (delete
  the old, run `pnpm install`).
- Convert `package.json` `workspaces: [...]` to `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - excalidraw-app
    - packages/*
    - examples/*
    - apps/*
  ```

- Adjust root scripts where needed (`yarn --cwd ...` → `pnpm --filter
  ...`). Keep behavior identical.
- Verify upstream Excalidraw still builds: `pnpm --filter excalidraw-app
  build`.

### 2. Scaffold `apps/desktop/`

```
apps/desktop/
├── package.json              # name: "omnidraw-desktop"
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── favicon.svg          # cyan dot
└── src/
    ├── main.tsx              # React 19 entry
    ├── App.tsx               # only renders <BrandShell/> for now
    ├── styles/
    │   ├── tokens.css        # imported from prototype/styles/tokens.css (move/copy)
    │   └── globals.css       # @import "tailwindcss"; @theme tokens
    ├── components/
    │   ├── ui/               # primitives — empty for now (Frontend team fills)
    │   └── assistant-ui/     # output of `npx assistant-ui init`
    ├── contracts/            # ← THE LOAD-BEARING DELIVERABLE
    │   ├── chat.ts
    │   ├── storage.ts
    │   ├── canvas.ts
    │   ├── skills.ts
    │   ├── auth.ts
    │   └── index.ts          # re-exports
    ├── agent/                # owned by Agent team — Foundation only places stubs
    │   └── README.md
    ├── canvas/               # owned by Canvas team — stubs only
    │   └── README.md
    └── storage/              # owned by Storage team — stubs only
        └── README.md
```

### 3. Stack

- **Vite 5** + React 19 + TypeScript 5.6+
- **Tailwind v4** (`@import "tailwindcss"` + `@theme` directive)
- **assistant-ui** scaffolded via `npx assistant-ui init` (only the
  primitives — wiring is Frontend team's job)

### 4. Tailwind v4 theme bridge

In `src/styles/globals.css`:

```css
@import "tailwindcss";
@import "./tokens.css";

@theme {
  /* Map omnidraw tokens → Tailwind utilities */
  --color-bg-page: #08090a;
  --color-bg-panel: #0f1011;
  --color-bg-surface: #191a1b;
  --color-bg-surface-hover: #28282c;

  --color-text-primary: #f7f8f8;
  --color-text-body: #d0d6e0;
  --color-text-muted: #8a8f98;
  --color-text-subtle: #62666d;

  --color-border-subtle: rgba(255, 255, 255, 0.05);
  --color-border-default: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.12);

  --color-accent: #06b6d4;
  --color-accent-hover: #22d3ee;
  --color-accent-bright: #67e8f9;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;

  --font-sans: "Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace;

  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;

  --radius-1: 2px;
  --radius-2: 4px;
  --radius-3: 6px;
  --radius-4: 8px;
  --radius-5: 12px;
}
```

This makes `bg-bg-page`, `text-text-body`, `border-border-default`,
`p-4`, `rounded-3` etc. resolve to omnidraw values.

### 5. The brand shell (placeholder UI)

`src/components/BrandShell.tsx` is a temporary page that proves the
stack works:

- Centered `omnidraw` wordmark (cyan dot + "omnidraw")
- One subtitle: "Foundation in place. Teams take over from here."
- Three primitive demos (a `Button`, an `Input`, a `Badge`) using
  Tailwind classes — proves token bridge works
- A "version" footer reading the `package.json` version

Frontend team replaces this with the real shell in S2.

### 6. Interface contracts

These are the **load-bearing files**. Every team imports types from
here. Get these right and parallel work composes; get them wrong and
integration is painful.

#### `contracts/chat.ts`

```typescript
import type { CanvasController } from "./canvas";

/** A single message in a thread. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  /** Markdown content. */
  content: string;
  /** Tool calls the assistant made in this message. */
  toolCalls?: ToolCall[];
  createdAt: string; // ISO8601
}

export interface ToolCall {
  id: string;
  name: string;          // e.g. "create_scene", "add_element"
  args: unknown;         // JSON
  /** undefined while pending; set when complete. */
  result?: { ok: true; value: unknown } | { ok: false; error: string };
}

/** Implemented by the Agent team. Consumed by Frontend (assistant-ui adapter). */
export interface ChatModelAdapter {
  /**
   * Stream a response for the given thread state.
   * Yields incremental updates suitable for assistant-ui's runtime.
   */
  send(input: {
    threadId: string;
    messages: ChatMessage[];
    skillId?: string;       // currently selected skill
    canvas: CanvasController; // the agent calls canvas tools through this
  }): AsyncIterable<ChatStreamEvent>;

  /** Stop an in-flight generation. */
  cancel(threadId: string): Promise<void>;

  /** Health check used at app startup. */
  ping(): Promise<{ ok: true; model: string } | { ok: false; reason: string }>;
}

export type ChatStreamEvent =
  | { type: "token"; messageId: string; delta: string }
  | { type: "tool_call_start"; messageId: string; tool: ToolCall }
  | { type: "tool_call_complete"; messageId: string; toolId: string; result: ToolCall["result"] }
  | { type: "message_complete"; messageId: string }
  | { type: "error"; reason: string };
```

#### `contracts/canvas.ts`

```typescript
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

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
```

#### `contracts/storage.ts`

```typescript
/** Implemented by the Storage team. Consumed by Frontend, Agent, Canvas. */
export interface StorageAdapter {
  // Projects (folders on disk)
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(input: { name: string; description?: string }): Promise<Project>;
  renameProject(id: string, name: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Scenes (.excalidraw files in project folder)
  listScenes(projectId: string): Promise<SceneRef[]>;
  getScene(projectId: string, sceneId: string): Promise<Scene>;
  saveScene(projectId: string, scene: Scene): Promise<SceneRef>;
  deleteScene(projectId: string, sceneId: string): Promise<void>;

  // Threads (chat conversation, in SQLite)
  listThreads(projectId: string): Promise<ThreadRef[]>;
  getThread(threadId: string): Promise<Thread>;
  appendMessage(threadId: string, msg: import("./chat").ChatMessage): Promise<void>;
  createThread(projectId: string, input: { title?: string }): Promise<ThreadRef>;
  deleteThread(threadId: string): Promise<void>;

  // Settings (per-app)
  getSetting<T = unknown>(key: string): Promise<T | null>;
  setSetting<T = unknown>(key: string, value: T): Promise<void>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  path: string; // absolute path on disk
  sceneCount: number;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneRef {
  id: string;
  title: string;
  filename: string;
  thumbnail?: string; // data URL
  updatedAt: string;
}

export interface Scene extends SceneRef {
  elements: import("@excalidraw/excalidraw/types/element/types").ExcalidrawElement[];
  appState?: Record<string, unknown>;
}

export interface ThreadRef {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface Thread extends ThreadRef {
  messages: import("./chat").ChatMessage[];
}
```

#### `contracts/skills.ts`

```typescript
/** Read by the Agent team to drive Pi. Read by Frontend for the picker. */
export interface SkillManifest {
  id: string;             // e.g. "diagram-explainer"
  name: string;           // "Diagram explainer"
  description: string;    // shown in picker
  icon?: string;          // single character or emoji for the picker
  shortcut?: string;      // "1" .. "9" for the picker
  /** System prompt + behaviour rules. Loaded on demand. */
  loadBody(): Promise<string>;
}

export interface SkillRegistry {
  list(): Promise<SkillManifest[]>;
  get(id: string): Promise<SkillManifest | null>;
}
```

#### `contracts/auth.ts`

```typescript
/** Implemented partly by the Agent team (Tauri commands), consumed by Frontend. */
export interface AuthAdapter {
  /** True if a key is in keychain and verified at last check. */
  isConnected(): Promise<boolean>;

  /** Begin RFC 8628 device flow against omnizen.ai. */
  startConnect(): Promise<{ userCode: string; verificationUriComplete: string }>;

  /**
   * Poll until approved/denied/expired. Resolves once final state reached.
   * Implementation opens browser via tauri shell plugin and stores key in keychain on success.
   */
  awaitConnect(): Promise<
    | { kind: "approved" }
    | { kind: "denied" }
    | { kind: "expired" }
    | { kind: "error"; reason: string }
  >;

  /** Cancel a connect-in-progress (user clicked "Cancel"). */
  cancelConnect(): Promise<void>;

  /** Manual fallback: validate + store a pasted key. */
  storeKey(apiKey: string): Promise<{ ok: true } | { ok: false; reason: string }>;

  /** Disconnect — wipe keychain entry. */
  disconnect(): Promise<void>;
}
```

#### `contracts/index.ts`

```typescript
export * from "./chat";
export * from "./canvas";
export * from "./storage";
export * from "./skills";
export * from "./auth";
```

### 7. Verification (acceptance criteria)

The Foundation agent must verify before committing:

- [ ] `pnpm install` succeeds at root, generates `pnpm-lock.yaml`
- [ ] `pnpm --filter excalidraw-app build` still succeeds (upstream not broken)
- [ ] `pnpm --filter omnidraw-desktop dev` opens `http://localhost:5173`
  showing the brand shell
- [ ] In dev, a button styled `bg-accent text-bg-page` renders cyan
  with near-black text (token bridge works)
- [ ] `apps/desktop/src/contracts/index.ts` exports types matching the
  shapes above
- [ ] `apps/desktop/src/components/assistant-ui/` exists with output of
  `npx assistant-ui init`
- [ ] Playwright test: load the page, screenshot saved to
  `apps/desktop/__visual__/foundation.png`, asserts brand wordmark is
  visible

### 8. Commit

One commit on `feat/omnidraw-foundation`:

```
feat(foundation): repo skeleton + interface contracts

- Migrate root yarn 1.22 → pnpm; add apps/* to workspaces
- Scaffold apps/desktop (Vite + React 19 + Tailwind v4 + assistant-ui)
- Bridge omnidraw tokens.css to Tailwind via @theme
- Drop in interface contracts that the four parallel teams consume:
  ChatModelAdapter, CanvasController, StorageAdapter, SkillRegistry,
  AuthAdapter
- Brand shell placeholder (Frontend team replaces in S1/S2)

Excalidraw upstream packages untouched. excalidraw-app build verified.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Do NOT push to remote. Foundation agent reports the branch + commit hash
back to the orchestrator.

## Out of scope

- Real chat (Agent team / S3)
- Real canvas (Canvas team / S4)
- Real storage (Storage team / S6)
- Tauri shell (S10, integration phase)
- Auth implementation (Agent team / S9)
- Replacing the brand shell (Frontend team / S1+S2)

## What the Foundation agent must NOT do

- Don't touch `excalidraw-app/`, `packages/`, `examples/` source code
- Don't add dependencies the contracts don't require
- Don't write team logic — only stubs (README files in agent/, canvas/,
  storage/) that say "Owned by Team X — see contracts/"
- Don't push the branch — local commit only
