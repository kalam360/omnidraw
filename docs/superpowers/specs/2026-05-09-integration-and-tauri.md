# Integration phase + Segment 10 (Tauri packaging)

**Date**: 2026-05-09
**Owner**: one integration agent, runs after all four parallel teams have shipped + been reviewed + approved
**Branch**: `feat/omnidraw-integration` off `feat/omnidraw-foundation`
**Worktree**: `/Users/kalam/dev/omnidraw.worktrees/integration`
**Output**: a single mergeable branch with all four team's work composed and verified end-to-end, plus a Tauri shell that wraps the SPA into a desktop app.

## Inputs

When this agent runs, the following branches exist locally and have been
code-reviewed:

- `feat/omnidraw-foundation` (cc6b1e4c) — base
- `feat/omnidraw-team-storage` — owns `apps/desktop/src/storage/`
- `feat/omnidraw-team-canvas` — owns `apps/desktop/src/canvas/`
- `feat/omnidraw-team-agent` — owns `apps/desktop/src/agent/`
- `feat/omnidraw-team-frontend` — owns `apps/desktop/src/{ui,shell,chat,routes,onboarding,presentation,settings,lib,components}/`

## Merge order (matters)

Each team owns a disjoint subtree, so merges should be conflict-free
in source code. Conflicts can still happen in `apps/desktop/package.json`
(deps lists) and `pnpm-lock.yaml` (lockfile). Order minimizes rework:

1. **Storage** first — narrowest deps (`better-sqlite3`, `vitest`)
2. **Canvas** second — adds `@excalidraw/excalidraw` workspace dep + `morphdom`
3. **Agent** third — adds Pi packages
4. **Frontend** last — consumes all three and adds the most deps; merging it last lets Frontend resolve any final lockfile conflicts in one pass

For each team, in order:

```bash
cd /Users/kalam/dev/omnidraw.worktrees/integration
git checkout feat/omnidraw-integration
git merge --no-ff feat/omnidraw-team-<X>
# resolve any package.json / pnpm-lock.yaml conflicts (deps merge cleanly)
pnpm install                       # regenerate lockfile
pnpm --filter omnidraw-desktop test:<X>  # verify the team's tests still pass
git add . && git commit             # if anything changed during merge
```

If a team's tests fail post-merge, the integration agent must surface
this — don't paper over.

## Adapter wiring (the load-bearing step)

Frontend's stub adapters in `apps/desktop/src/lib/adapters/stub-*.ts`
need to be replaced with the real implementations from each team.

The replacement is one line per adapter inside
`adapters-context.tsx`:

```tsx
// before
import { StubChatAdapter } from "./stub-chat";
const chat = new StubChatAdapter();

// after
import { OmnidrawChatAdapter } from "@/agent";
const chat = new OmnidrawChatAdapter({ /* config */ });
```

Same pattern for canvas, storage, auth. The integration agent
performs these swaps in a single commit, then verifies each adapter's
public surface matches what Frontend's contracts consumed.

If there's a mismatch (Frontend expected a method that the
team didn't ship), fix it on Frontend's side — that's where the
adapter is consumed.

## End-to-end smoke test

After all merges + adapter wiring, run a manual end-to-end flow once
to confirm everything composes:

```bash
pnpm --filter omnidraw-desktop dev
```

Then in the browser:

1. Welcome → Connect (clicks "Connect with Omnizen") → device flow opens
   a tab to omnizen.ai (real network call; uses the user's Omnizen
   account)
2. Approve → key is stored → Create first project ("Integration test")
3. In the project, send a message: "Draw a flow chart for [user @
   integration time picks something simple]"
4. Verify: agent emits tokens → tool call card appears →
   `DrawingReplay` plays → canvas updates on the right pane → scene
   saved to `~/omnidraw/projects/integration-test/scenes/*.excalidraw`
5. Press F → presentation mode opens → ← → navigates → Esc exits
6. Quit and relaunch dev server → state restored from disk (project
   + scene + thread visible)

If this works, integration is done. Capture a screenshot of step 4
into `apps/desktop/__visual__/integration-e2e.png`.

## Build must pass

```bash
pnpm --filter omnidraw-desktop typecheck   # no errors
pnpm --filter omnidraw-desktop build       # clean build
pnpm --filter omnidraw-desktop test        # all teams' tests pass
```

If `typecheck` or `build` fails, walk the errors. The most likely
culprit is the assistant-ui scaffold drift the Frontend team was
told to fix in S1 — verify they did, and if not, fix it now.

## Segment 10 — Tauri packaging

After integration is verified working, add the desktop wrapper.

```
apps/desktop/src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
└── src/
    ├── main.rs                   # entry, plugin registration
    ├── auth.rs                   # device-flow Tauri commands (calls into agent's logic)
    ├── keychain.rs               # tauri-plugin-keyring wrapper
    ├── shell.rs                  # tauri-plugin-shell::open for browser launch
    └── menu.rs                   # macOS menubar
```

### Tauri config highlights

- App identifier: `ai.omnizen.omnidraw`
- Window: 1280×800 default, 1024×640 minimum, restorable size + position
- Mac titlebar: `transparent`, hidden by default
- Linux: AppImage + .deb
- Windows: MSI installer

### Plugins

- `tauri-plugin-shell` — open browser for device flow
- `tauri-plugin-keyring` — store Omnizen API key in OS keychain
- `tauri-plugin-fs` — for the Storage team's filesystem ops if we
  decide to move them out of Node into Rust later (v1: keep in Node
  via the existing `node:fs/promises` calls)
- `tauri-plugin-clipboard-manager` — for "Copy as PNG" exports
- `tauri-plugin-dialog` — for "Open .excalidraw" dialogs

### Sidecar — the Pi/agent process

Tauri can run a sidecar binary. Two options:

**Option A** — run agent code in the same Tauri webview process
(simpler; agent runs in-renderer). Risk: agent hot-loops block UI.
**Option B** — bundle a Node binary as a sidecar; renderer talks to
sidecar over IPC. Heavier but isolates the agent loop.

Pick **A** for v1. If we hit responsiveness issues, switch to B in v2.
Document this choice in the package layout.

### Auth migration v1 → v2

Frontend currently stores the Omnizen API key via
`StorageAdapter.setSetting('omnizen.apiKey', ...)` (per Agent team's
fallback). At Tauri-packaging time, switch to
`tauri-plugin-keyring`. The Auth team's `keychain.ts` should already
have a comment marking the migration point. Update + delete the old
setting from SQLite on first run after upgrade.

### Build pipeline

```bash
pnpm --filter omnidraw-desktop tauri:dev    # dev with hot reload
pnpm --filter omnidraw-desktop tauri:build  # production binary
```

Mac signing/notarization is out of scope for v1 — local dev builds
are enough. Document the v2 path: Apple Developer ID + notarization +
a GitHub Actions workflow.

## Acceptance criteria for the integration agent

- [ ] All four team branches merged to `feat/omnidraw-integration` with
      no source conflicts
- [ ] `pnpm install` produces a clean `pnpm-lock.yaml`
- [ ] `pnpm --filter omnidraw-desktop typecheck` passes
- [ ] `pnpm --filter omnidraw-desktop build` passes
- [ ] `pnpm --filter omnidraw-desktop test` runs all four teams' tests; all pass
- [ ] Stub adapters replaced with real adapters in
      `adapters-context.tsx`; no `stub-*.ts` files imported in app code
      (delete them)
- [ ] Manual e2e flow above completes successfully (capture screenshot)
- [ ] `pnpm tauri build` produces a working `.app` (mac) or
      equivalent on the orchestrator's platform; launch it, verify it
      runs the same flow; capture screenshot
- [ ] One squash-merge commit message:

  ```
  feat: omnidraw v1 — integrated app

  Composes the four parallel teams' work into a single integrated
  branch and adds Tauri packaging:

  - Storage (B3 hybrid via better-sqlite3) wired into adapters context
  - Canvas (branded Excalidraw + DrawingReplay) wired
  - Agent (Pi + Omnizen + 3 skills + device-flow client) wired
  - Frontend (13-route React app, assistant-ui customized) consumes
    real adapters
  - Tauri 2 shell wrapping the SPA: keychain via tauri-plugin-keyring,
    browser open via tauri-plugin-shell, fs/dialog/clipboard plugins

  Closes the parallel-team plan. v1 ships as a desktop app for macOS
  + Linux + Windows.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Reporting back

Under 300 words covering:

- Branch + commit hash
- Worktree path (typically `/Users/kalam/dev/omnidraw.worktrees/integration`)
- Each team's pre-merge / post-merge test results
- Any contract mismatches found + how resolved
- The e2e screenshot path
- Any deferred items (signing, notarization, things noted as v2)

## What's still v2 / out of scope for v1

- Apple Developer ID signing + notarization
- Windows code signing
- Linux flatpak / snap distribution
- GitHub Actions release pipeline
- Auto-update via tauri-plugin-updater
- Mobile (iPad)
- Self-hosted / web-only deployment of the SPA (the SPA technically
  works in a browser today, but production hosting is not v1)
