# Team STORAGE — prompt-spec

**Date**: 2026-05-09
**Owner**: one agent in an isolated worktree
**Branch**: `feat/omnidraw-team-storage` off `feat/omnidraw-foundation`
**Worktree**: `/Users/kalam/dev/omnidraw.worktrees/storage`
**Owns folder**: `apps/desktop/src/storage/`
**Implements contract**: `StorageAdapter` (from `apps/desktop/src/contracts/storage.ts`)

## Mission

Implement the **B3 hybrid storage layer** behind the `StorageAdapter`
contract: per-project folders on disk for `.excalidraw` scenes,
SQLite for threads + metadata + cross-references. This is Segment 6.

You are one of four parallel teams. Don't touch any folder other than
`apps/desktop/src/storage/`. Read everyone else's contracts in
`apps/desktop/src/contracts/` — implement only your own.

## Storage layout on disk

```
~/omnidraw/
├── library.db                    # SQLite — projects, threads, messages, settings
└── projects/
    └── <project-id>/             # one folder per project
        ├── project.json          # metadata mirror (name, description, created_at)
        ├── scenes/
        │   ├── <scene-id>.excalidraw
        │   └── …
        └── thumbnails/           # auto-generated PNG thumbs for the queue UI
            └── <scene-id>.png
```

The `library.db` is the source of truth for **threads** + **cross-references**
(which thread spawned which scene). The disk folder is the source of
truth for **scene contents**. On read, we always fetch scene bodies from
disk (so users can git their projects); we use SQLite only for indexes.

## SQLite schema (proposed)

```sql
CREATE TABLE projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  path          TEXT NOT NULL,             -- absolute path to project folder
  created_at    TEXT NOT NULL,             -- ISO8601
  updated_at    TEXT NOT NULL
);

CREATE TABLE scenes (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  filename      TEXT NOT NULL,             -- "<scene-id>.excalidraw"
  thumbnail     TEXT,                       -- relative path to thumb png
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_scenes_project ON scenes(project_id, updated_at DESC);

CREATE TABLE threads (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_threads_project ON threads(project_id, updated_at DESC);

CREATE TABLE messages (
  id            TEXT PRIMARY KEY,
  thread_id     TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,             -- markdown
  tool_calls    TEXT,                       -- JSON array (nullable)
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);

CREATE TABLE settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL              -- JSON
);
```

Migrations live in `apps/desktop/src/storage/migrations/` as numbered
SQL files. Run on adapter init, idempotent.

## SQLite driver

Use **`better-sqlite3`** (`pnpm add better-sqlite3 -w` in
`apps/desktop`). Synchronous API, fast, well-known.

**Important**: `better-sqlite3` is a native module. It needs to compile
on `pnpm install`. Add `better-sqlite3` to the root `package.json`'s
`pnpm.onlyBuiltDependencies` list (it's already there from omnizen-ai —
copy that pattern if needed).

The contract is async; wrap better-sqlite3 calls in `Promise.resolve(...)`
so the interface stays consistent with future cross-process backends.

## File API

Use Node's `node:fs/promises`. Don't use Tauri's fs-plugin yet — the
storage layer is pure Node and runs in the sidecar (Segment 10
integrates Tauri).

```ts
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
```

The base path defaults to `path.join(homedir(), "omnidraw")` but is
overridable via the settings table (`workspace_root`).

## Implementation skeleton

```
apps/desktop/src/storage/
├── index.ts                      # exports a single createStorage() factory
├── adapter.ts                    # StorageAdapter implementation
├── db.ts                         # better-sqlite3 wrapper, prepared statements
├── files.ts                      # disk operations (.excalidraw, thumbnails)
├── ids.ts                        # createId() — short, URL-safe (nanoid alphabet)
├── migrations/
│   ├── 001-initial.sql
│   ├── 002-...sql
│   └── index.ts                  # runner
├── thumbnails.ts                 # generates PNG thumbs from .excalidraw scenes
└── __tests__/
    ├── adapter.test.ts           # one test per public method, real fs/db
    ├── concurrency.test.ts       # parallel writes don't corrupt
    └── migrations.test.ts        # migrations run idempotently
```

Use **vitest** for tests. Each test gets its own tmp directory
(`os.tmpdir()` + random suffix), no shared state.

## Concurrency rules

- All write operations are atomic at the file level: write to
  `<id>.excalidraw.tmp`, then `rename` to `<id>.excalidraw`. Never
  observed half-written.
- SQLite writes use a transaction per logical operation. Single
  `db.transaction(...)` per public method.
- `appendMessage` is the hot path — make it fast. Prepared statement,
  single insert + UPDATE thread.message_count + UPDATE thread.updated_at,
  one transaction.

## Thumbnails

When `saveScene` is called, also regenerate the thumbnail. Use
`@excalidraw/excalidraw`'s `exportToBlob({ mimeType: "image/png" })` if
it works in Node, otherwise punt: write the thumbnail field as `null`
for now and let the canvas team produce thumbs from the renderer in
S5. Document the choice in your PR.

## Tests must pass

```bash
pnpm --filter omnidraw-desktop test:storage
```

This runs vitest scoped to `src/storage/`. Acceptance criteria:

- All `StorageAdapter` methods covered by at least one happy-path test
- One concurrency test: 100 parallel `saveScene` calls on the same
  scene-id end with valid file content, no orphaned `.tmp` files
- Migrations are idempotent: run twice on a fresh DB, no duplicate
  schema errors
- A round-trip test: create project → create scene → save → restart
  storage instance → list → read scene → matches what was saved

## Hard constraints

- **Don't touch** anything outside `apps/desktop/src/storage/` and the
  package.json deps you need to add.
- **Don't read** `apps/desktop/src/{agent,canvas,ui,routes,onboarding,presentation}/`
  source code except via type imports from `contracts/`.
- **Don't push** the branch.
- **One commit** at the end with this message:

  ```
  feat(storage): B3 hybrid storage layer + SQLite migrations

  Implements StorageAdapter against ~/omnidraw/{library.db, projects/}.
  - better-sqlite3 backend with prepared statements + transactions
  - Atomic file writes (tmp + rename)
  - Migration runner, vitest coverage, concurrency tests

  Closes Segment 6 of the parallel implementation plan.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Reporting back

Under 200 words covering:
- Branch + commit hash
- Worktree path
- Acceptance criteria results (which passed, deviations)
- Any contract changes you needed (raise these as questions, don't
  unilaterally edit `contracts/storage.ts` unless there's a real bug)
- Performance notes (how fast is `appendMessage`? `listScenes`?)

## Frictions to expect

- **better-sqlite3 native build** can fail on Apple Silicon if Node
  was compiled differently. If `pnpm install` fails on it, try
  `pnpm rebuild better-sqlite3`. If that doesn't work, document the
  fix and fall back to `sql.js` (slower, pure JS).
- **`@excalidraw/excalidraw` in Node** may require a DOM shim for thumb
  generation. If it does, defer thumbs to S5 (canvas team) — don't
  block storage on canvas.
- **Path collisions if user has weird project names** — sanitize names
  to `[a-z0-9-]+` for the folder name; keep the raw display name in
  the DB.

Begin.
