# Team CANVAS — prompt-spec

**Date**: 2026-05-09
**Owner**: one agent in an isolated worktree
**Branch**: `feat/omnidraw-team-canvas` off `feat/omnidraw-foundation`
**Worktree**: `/Users/kalam/dev/omnidraw.worktrees/canvas`
**Owns folder**: `apps/desktop/src/canvas/`
**Implements contract**: `CanvasController` (from `apps/desktop/src/contracts/canvas.ts`)

## Mission

Embed the branded Excalidraw canvas, expose canvas operations to the
Pi extension via `CanvasController`, and lift the live-drawing replay
component from CopilotKit/excalidraw-studio.

This is **Segments 4 and 5** combined — both touch the same canvas
folder, so one team owns both.

## Two pieces of work

### Piece A — Branded Excalidraw embed + CanvasController (S4)

Embed the upstream `@excalidraw/excalidraw` React component (the npm
package, not a fork — we consume it as a dep). Wire it to the
`CanvasController` interface so the Pi extension can drive it
programmatically.

Branding: rename `Excalidraw` → `Omnidraw` in chrome where it appears
(window title, logo bits). The canvas itself stays visually unchanged
— it's the proven hand-drawn aesthetic we want.

Key files:

```
apps/desktop/src/canvas/
├── index.ts                      # exports createCanvas() factory
├── OmnidrawCanvas.tsx            # the React wrapper component
├── controller.ts                 # CanvasController implementation
├── tools.ts                      # element-construction helpers
├── theme.ts                      # adapt Excalidraw's defaults to omnidraw cyan accent
└── __tests__/
    └── controller.test.ts        # vitest, jsdom + Excalidraw
```

`OmnidrawCanvas` is a forwardRef component that returns a
`CanvasController` via imperative handle:

```tsx
export const OmnidrawCanvas = forwardRef<CanvasController, Props>(
  (props, ref) => {
    const apiRef = useRef<ExcalidrawImperativeAPI>(null);
    useImperativeHandle(ref, () => createController(apiRef), [apiRef]);
    return <Excalidraw ref={apiRef} ... />;
  }
);
```

The Frontend team uses it like:

```tsx
const canvasRef = useRef<CanvasController>(null);
<OmnidrawCanvas ref={canvasRef} />
// later: pass canvasRef.current to the Pi adapter as the canvas tool target
```

Strip the Excalidraw collab/Firebase UI elements (per locked decisions
doc — collab is out for v1). The npm package may not include them by
default; verify and remove any references that show up.

### Piece B — Live-drawing replay component (S5)

Lift CopilotKit/excalidraw-studio's `mcp-app.tsx` morphdom-based
element-by-element replay into our canvas folder. This is the "scene
draws itself in chat" effect.

Reference implementation:
`https://github.com/CopilotKit/excalidraw-studio/blob/main/server/src/mcp-app.tsx`

Adapt it to:
- Run as a React component in our SPA (not as an MCP iframe widget)
- Take a stream of element events from the Pi sidecar (not from MCP)
- Render at the size of an `assistant-ui` tool-call card (compact, ~240px tall)
- Use `@excalidraw/excalidraw`'s `exportToSvg` + morphdom for the diff effect

Files:

```
apps/desktop/src/canvas/replay/
├── DrawingReplay.tsx             # the React component
├── replay.ts                     # core diff/morphdom logic
└── __tests__/
    └── replay.test.ts
```

The component takes:

```ts
type Props = {
  stream: AsyncIterable<{ kind: "element"; element: ExcalidrawElement } | { kind: "done" }>;
  width?: number;
  height?: number;
};
```

Frontend team plugs it into the `assistant-ui` tool-call render slot
for `create_scene` / `add_elements` calls.

## Hard constraints

- **Don't touch** anything outside `apps/desktop/src/canvas/` and the
  one or two `package.json` lines you need for `@excalidraw/excalidraw`
  + `morphdom`.
- **Don't read** other teams' source. Only `contracts/` types.
- **Don't fork upstream Excalidraw.** Consume the npm package. The
  cloned excalidraw monorepo at the repo root is **not** what we ship
  — we use it for design reference and (later) potential tweaks.
  Today, depend on the published package.
- **Match the prototype's canvas aesthetic** — see screens
  `#session` and `#session-drawing` in `prototype/app.html` (use the
  preview panel). The hand-drawn diagrams in those mocks are SVG
  approximations of what the real canvas will look like with our
  scenes.
- **One commit** at the end:

  ```
  feat(canvas): branded Excalidraw embed + live-drawing replay

  - OmnidrawCanvas component implementing CanvasController
  - Element-construction helpers for the agent's create/add/update/remove
    tool calls (S4)
  - DrawingReplay component lifted from excalidraw-studio's morphdom-
    based renderer, adapted for assistant-ui tool-call cards (S5)
  - Excalidraw collab/Firebase UI bits stripped per locked decisions

  Closes Segments 4 and 5 of the parallel implementation plan.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Acceptance criteria

- `pnpm --filter omnidraw-desktop test:canvas` passes
- Storybook story (or simple page in BrandShell) renders an
  `OmnidrawCanvas` with three pre-loaded elements; user can drag them
  with the mouse
- A unit test confirms `CanvasController.setScene(elements)` then
  `getScene()` round-trips the elements faithfully
- A unit test confirms `DrawingReplay` plays a 3-element stream
  end-to-end without errors
- Bundle size: the canvas folder + Excalidraw + morphdom adds <800kB
  gzip to the SPA. (Excalidraw is already big; just verify we don't
  blow it up further.)

## Reporting back

Under 200 words:
- Branch + commit hash
- Worktree path
- Acceptance criteria pass/deviations
- Any decisions on the Excalidraw integration (which version pinned,
  any collab bits we left in for now, theme adjustments)
- DrawingReplay: how does it perform with 30+ elements? Note any
  hitches.

## Frictions to expect

- **Excalidraw + Vite SSR** — Excalidraw is heavy on browser-only
  globals. Use dynamic import / `lazy()` so it only loads in the
  browser. SPA build should be fine, but watch for tests in jsdom that
  fail on `window.matchMedia` etc. — shim if needed.
- **morphdom + React** — morphdom mutates DOM directly; React doesn't
  like that. Render the replay into a `ref`'d div, let morphdom
  manage its children, never re-render that div from React.
- **The studio repo** at `https://github.com/CopilotKit/excalidraw-studio`
  is MIT — you can copy code but credit it. Add a `LICENSES.md` entry
  noting the lifted file's origin and license.

Begin.
