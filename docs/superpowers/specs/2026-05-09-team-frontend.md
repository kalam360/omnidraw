# Team FRONTEND — prompt-spec

**Date**: 2026-05-09
**Owner**: one agent in an isolated worktree
**Branch**: `feat/omnidraw-team-frontend` off `feat/omnidraw-foundation`
**Worktree**: `/Users/kalam/dev/omnidraw.worktrees/frontend`
**Owns folders**: `apps/desktop/src/{ui,routes,onboarding,presentation,settings}/` + the shared shell components
**Consumes contracts**: all five (`chat`, `canvas`, `storage`, `skills`, `auth`)

## Mission

Port the locked HTML prototype to React, consuming the four other
teams' contracts via stubbed adapters until integration. This is the
broadest-surface team — it owns the user-visible app.

You build:

- **Component primitives** — port the prototype's CSS components
  (Button, Input, Card, Badge, ChatMessage, NavItem, etc.) to React
  using Tailwind classes that hit the omnidraw tokens via the
  `@theme` bridge already wired by Foundation
- **App shell layout** — the two-column sidebar + chat + canvas split
  matching `prototype/app.html` screen `#session`
- **All 13 screens** from the prototype, rendered as real routes
- **Presentation mode L2** — fullscreen + ← → hotkeys + scene queue
- **Skill picker modal**, error states, loading states

This is **Segments 1, 2, 8, and the UI half of 9** combined — frontend
is one team because all this work touches the same component tree.

## Source of truth: the prototype

```
/Users/kalam/dev/omnidraw.worktrees/frontend/prototype/app.html
```

This is the locked visual design. Match it exactly. Visual diff
against it as part of acceptance.

If you have any doubt about layout, type, spacing, or color, **read
the prototype** — don't guess.

`prototype/styles/{tokens,components}.css` are the source files;
Foundation has already imported tokens into the SPA and wired
Tailwind's `@theme` to them.

## Routes

```
/welcome                           → Welcome (onboarding step 1)
/connect                           → Connect Omnizen (onboarding step 2)
/connecting                        → Device-flow in progress
/projects/new                      → Create first project
/projects                          → Project list (empty state if no projects)
/projects/:projectId               → Project view (no scene = empty state)
/projects/:projectId/threads/:threadId  → Active session
/projects/:projectId/present       → Presentation mode (fullscreen)
/settings                          → Settings (sectioned)
```

Route off React Router 6 (or `wouter` if you want lighter — Foundation
will tell you which is configured; default to React Router).

## Folder layout

```
apps/desktop/src/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── StatusDot.tsx
│   ├── Spinner.tsx
│   ├── Modal.tsx
│   ├── Alert.tsx
│   ├── Toggle.tsx
│   ├── Select.tsx
│   ├── Kbd.tsx
│   ├── Tooltip.tsx
│   └── index.ts                  # re-exports
├── shell/
│   ├── AppShell.tsx              # the 2-column layout
│   ├── Sidebar.tsx
│   ├── ProjectList.tsx
│   ├── ThreadList.tsx
│   ├── ChatPane.tsx              # houses the assistant-ui Thread
│   ├── CanvasPane.tsx            # houses the OmnidrawCanvas + scene queue
│   ├── SceneQueue.tsx
│   └── ConnectionBadge.tsx       # status dot in sidebar foot
├── chat/
│   ├── ChatThread.tsx            # wraps assistant-ui's <Thread/>
│   ├── ChatComposer.tsx          # custom composer with skill picker chip
│   ├── ToolCallCard.tsx          # render slot for tool calls
│   └── DrawingReplayCard.tsx     # uses canvas team's <DrawingReplay/>
├── routes/
│   ├── App.tsx                   # router root
│   ├── Welcome.tsx
│   ├── Connect.tsx
│   ├── Connecting.tsx
│   ├── CreateProject.tsx
│   ├── ProjectList.tsx
│   ├── ProjectView.tsx
│   ├── Session.tsx
│   ├── Settings/
│   │   ├── index.tsx
│   │   ├── Connection.tsx
│   │   ├── Model.tsx
│   │   ├── Storage.tsx
│   │   ├── Appearance.tsx
│   │   └── DangerZone.tsx
│   └── NotFound.tsx
├── presentation/
│   ├── PresentationMode.tsx
│   ├── HudTop.tsx
│   ├── SceneStrip.tsx
│   └── hotkeys.ts                # ← / → / F / Esc / ?
├── onboarding/
│   ├── steps.ts                  # ordering, progress indicator state
│   └── components/
│       └── StepIndicator.tsx
└── lib/
    ├── stores/                   # zustand stores (or react-query for server state)
    │   ├── projects.ts
    │   ├── threads.ts
    │   └── connection.ts
    ├── adapters/
    │   ├── stub-chat.ts          # ChatModelAdapter stub for dev
    │   ├── stub-storage.ts       # StorageAdapter stub
    │   ├── stub-canvas.ts        # CanvasController stub
    │   ├── stub-auth.ts          # AuthAdapter stub
    │   └── adapters-context.tsx  # React context providing all four
    └── hooks/
        ├── useHotkeys.ts
        ├── useAdapter.ts
        └── useStreamingMessage.ts
```

## Stub adapters — your dev fuel

Until integration, you don't have the other teams' implementations.
Build stubs in `lib/adapters/stub-*.ts` that return plausible data:

- `stub-storage`: in-memory projects/scenes/threads, seeded with one
  example project so all UI states render
- `stub-chat`: yields a canned stream when `send()` is called —
  one user message in the input, two tokens, one tool_call_start
  with `create_scene`, one tool_call_complete, then message_complete
- `stub-canvas`: no-op methods that log
- `stub-auth`: `isConnected()` returns `true` for the `?connected=1`
  query param, otherwise `false`; `awaitConnect()` resolves to
  `approved` after a 3-second delay

A single React context (`adapters-context.tsx`) provides all four so
swapping stubs for real implementations during integration is one
line per adapter.

## assistant-ui integration

The `apps/desktop/src/components/assistant-ui/` directory was
scaffolded by Foundation via `npx assistant-ui init`. Wire its `Thread`
component into `ChatPane.tsx`:

```tsx
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

function ChatPane() {
  const adapter = useChatAdapter();
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

`useLocalRuntime` takes a `ChatModelAdapter`. Map our contract's
`send(input): AsyncIterable<ChatStreamEvent>` to assistant-ui's
expected shape — there's an obvious mapping; assistant-ui has good
examples in their docs.

Customize the `Thread` via assistant-ui's slot pattern:
- Hide the default avatars + author labels (per locked chat-flow
  decision)
- Render user messages right-aligned in `bg-bg-surface` bubbles, agent
  messages full-width plain
- Replace the default tool-call render with our `<ToolCallCard/>`,
  which delegates to `<DrawingReplayCard/>` for `create_scene` and
  `add_elements` calls

## Hotkeys

Use a small custom hook (no library — `useEffect` + `keydown`):

| Key | Context | Action |
|---|---|---|
| `F` | Anywhere in `/projects/:id/threads/:tid` | Enter presentation mode |
| `←` `→` | Presentation mode | Previous / next scene |
| `Esc` | Presentation mode | Exit |
| `?` | Presentation mode | Toggle hotkey help overlay |
| `⌘K` / `Ctrl+K` | Anywhere | Open skill picker |
| `⌘N` / `Ctrl+N` | Anywhere | New thread in current project |
| `⌘,` / `Ctrl+,` | Anywhere | Open settings |

Disable hotkeys when an `<input>` or `<textarea>` is focused.

## Hard constraints

- **Don't touch** anything outside `apps/desktop/src/{ui,shell,chat,routes,onboarding,presentation,lib}/`
  and `apps/desktop/index.html`. Don't edit `agent/`, `canvas/`,
  `storage/`, `contracts/`, `components/assistant-ui/` source.
- **Visual fidelity** — the rendered app must match
  `prototype/app.html`. Run a Playwright visual diff before
  committing; investigate any diff over a small noise threshold.
- **Don't push**.
- **One commit**:

  ```
  feat(frontend): React app shell + 13 screens + presentation mode

  Ports the locked HTML prototype to React, consuming the four contracts
  via stub adapters until integration:
  - 13 component primitives in src/ui/ matching prototype's components.css
  - App shell (sidebar + chat + canvas) matching prototype #session
  - All 13 routes including onboarding (Welcome, Connect, Connecting,
    CreateProject), main app, presentation mode L2, settings, error/loading
    states
  - assistant-ui Thread customized to Claude/ChatGPT flow (no avatars/labels)
    with custom ToolCallCard + DrawingReplayCard render slots
  - Hotkeys: F/←/→/Esc/?/⌘K/⌘N/⌘,
  - Stub adapters in src/lib/adapters/ swapped 1-line during integration

  Closes Segments 1, 2, 8, and the UI half of 9.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Acceptance criteria

- `pnpm --filter omnidraw-desktop test:frontend` passes
- `pnpm --filter omnidraw-desktop dev` opens with the welcome screen;
  navigating through onboarding works end-to-end (using the stub auth
  adapter)
- Every route in the table above renders without a crash, even with
  the stub adapters' empty/seed data
- Playwright tests:
  - Visual snapshot of `/welcome` matches `prototype/app.html#welcome`
    within 1% diff
  - Same for `/connect`, `/projects`, `/projects/:id/threads/:tid`,
    `/presentation`, `/settings`
  - Hotkey tests: pressing F enters presentation, ← navigates
    backwards, Esc exits
- A11y: every interactive element is keyboard-reachable; sidebar nav
  is `<nav>` with proper landmarks; `Esc` closes modals
- Performance: `vite build` produces a chunk graph where the canvas
  bundle (Excalidraw) is lazy-loaded — verify with `--analyze`

## Reporting back

Under 200 words:
- Branch + commit hash
- Worktree path
- Acceptance results, including the Playwright diff numbers
- Any prototype-to-React fidelity issues you couldn't resolve
- Any contract concerns you need other teams to address before
  integration (be specific — "Storage's `appendMessage` returns
  `void` but I need the inserted message id back" etc.)
- assistant-ui customization notes — what you slotted, what defaults
  you kept

## Frictions to expect

- **assistant-ui's defaults vs our chat treatment** — its example
  themes show user messages with avatars + labels; our locked design
  removes those. Use assistant-ui's `MessagePrimitive` to compose your
  own message rendering rather than fighting the default.
- **Tailwind v4 token resolution** — verify `bg-accent`, `text-text-body`,
  etc. resolve in dev mode before assuming they work. If they don't,
  Foundation got the `@theme` bridge wrong; raise it immediately.
- **Excalidraw is heavy and browser-only** — lazy-load `<OmnidrawCanvas/>`
  and gate it behind `Suspense`. The presentation mode and project
  view both need the canvas; routes that don't (settings, projects
  list) shouldn't pay the bundle cost.
- **Excalidraw events vs your stores** — Excalidraw fires scene-change
  events when the user drags. Wire those to `StorageAdapter.saveScene`
  via a debounce (300ms) so you don't write on every keystroke.
- **Inter Variable + cv01/ss03** — Foundation should have the font set
  up. If letters look wrong, check the `@font-face` declarations and
  make sure `font-feature-settings: "cv01", "ss03"` is on `body`.

Begin.
