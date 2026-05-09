# Canvas

Owned by the Canvas team — implements the `CanvasController` contract from
`../contracts/canvas.ts`.

## Surface

- `OmnidrawCanvas` — the React wrapper around `@excalidraw/excalidraw`.
  `forwardRef<CanvasController, ...>` so callers can drive it
  programmatically.
- `createController(deps)` — controller factory, decoupled from React for
  testability.
- `buildElement` / `buildElements` — element-construction helpers used by
  the agent's `create_scene` / `add_elements` tool calls.
- `DrawingReplay` — element-by-element morphdom replay component, sized
  for an assistant-ui tool-call card. Adapted from
  CopilotKit/excalidraw-studio (see `LICENSES.md`).
- `theme.ts` — Excalidraw `appState` + `UIOptions` patches that adapt the
  upstream component to the omnidraw shell (cyan accent, dark theme,
  collab/Firebase chrome stripped).

## Tests

```
pnpm --filter omnidraw-desktop test:canvas
```

Vitest config: `apps/desktop/vitest.canvas.config.ts` — scoped to
`src/canvas/**` so we're decoupled from the rest of the monorepo's build
state during the parallel-implementation phase.
