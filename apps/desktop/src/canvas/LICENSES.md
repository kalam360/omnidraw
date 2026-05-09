# Third-party code in `apps/desktop/src/canvas/`

This directory contains code adapted from external open-source projects.
Per their licenses, attribution is preserved here.

## CopilotKit/excalidraw-studio (MIT)

Files derived from this project:

- `replay/replay.ts` — the morphdom-based element-by-element diff loop
  (`renderFrame`, `play`) is lifted from
  [`server/src/mcp-app.tsx`](https://github.com/CopilotKit/excalidraw-studio/blob/master/server/src/mcp-app.tsx)
  and adapted to run as a standalone React component instead of inside an
  MCP iframe widget.
- `replay/DrawingReplay.tsx` — the React shell around the replay loop is
  inspired by the same file's `Diagram` component.

The studio repository's `LICENSE` (MIT, © CopilotKit contributors) applies
to those derived portions. Modifications:

- Decoupled from `@modelcontextprotocol/ext-apps` — the replay loop now
  consumes a generic `AsyncIterable<ReplayEvent>` so any source (Pi
  sidecar, tests, fixtures) can drive it.
- Removed pencil-audio, viewport lerp animation, checkpoint persistence,
  and label-conversion helpers — none are needed for the assistant-ui
  tool-call card use case.
- Sized the wrapper for an `assistant-ui` tool-call card (default
  360×240), with width/height props.
- `exportToSvg` and `morphdom` are passed in as parameters so unit tests
  can inject lightweight stand-ins.
