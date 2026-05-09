# Omnidraw — Locked Decisions

**Date**: 2026-05-09
**Status**: design-phase, prototype underway

## What omnidraw is

Desktop teacher's cockpit for live YouTube classes. Branded Excalidraw canvas + AI chat sidebar that drives visualizations onto the canvas. Project/thread management, presentation-friendly. Open-source, monetized indirectly via [Omnizen](https://omnizen.ai) subscription (users bring their key).

## Locked decisions

| Concern | Choice |
|---|---|
| **Architecture** | Option 3 hybrid: Tauri shell + branded Excalidraw canvas + Pi sidecar (SDK). Lift studio's live-drawing replay component; otherwise keep stack lean. |
| **License** | AGPL-3.0 (omnidraw additions). Vendored OSS keeps original terms. |
| **Agent** | Pi as **SDK** (`@earendil-works/pi-agent-core` + `pi-ai`), not CLI subprocess. Embed in Node sidecar. |
| **Provider** | Omnizen via Anthropic-compatible base URL `https://api.omnizen.ai/v1`. User-supplied API key stored in OS keychain. Models: DeepSeek, Kimi, GLM, Qwen, MiniMax — Omnizen handles aliasing. |
| **MCP** | **Not used for canvas.** Pi extension drives canvas via Tauri IPC. Optional `pi-mcp-adapter` later for external tools. |
| **Data model** | B3 hybrid: per-project folders with `.excalidraw` files + SQLite for threads/metadata. |
| **Excalidraw upstream divergence** | Branding only. Strip Firebase / socket.io collab / Excalidraw+ exports. Easy upstream merges. |
| **Presentation mode** | L2 (scene deck/queue + fullscreen + ← → hotkeys) for v1. L3 studio mode deferred. |
| **Live collab** | Stripped from v1. |
| **Design system source** | Lift `linear-app/DESIGN.md` from [`nexu-io/open-design`](https://github.com/nexu-io/open-design) (Apache-2.0). Our `DESIGN.md` is the omnidraw-branded adaptation. |
| **Accent color** | Placeholder cyan `#22d3ee` / `#06b6d4` — replaceable in tokens.css if rebrand needed. |
| **UI build approach** | **HTML prototype first** in `prototype/` — pure HTML+CSS, no JS framework. Lock visuals before SPA implementation. |
| **Test strategy** | Web-first (Playwright MCP screenshots per segment). Desktop (Tauri) packaging is the final segment. |
| **Chat UI substrate (SPA)** | [`@assistant-ui/react`](https://github.com/assistant-ui/assistant-ui) (MIT, AgentbaseAI / Yonom, YC-backed, 400k+ MAU). Composable shadcn-style primitives. Streaming, auto-scroll, tool-call rendering, markdown, voice, retries — all built-in. Pi sidecar plugs in as a custom `ChatModelAdapter`. |
| **Theming bridge** | Tailwind v4 `@theme` directive maps omnidraw tokens.css → assistant-ui's Tailwind classes. HTML prototype is the visual spec; the React port mirrors it. |
| **Chat treatment** | Claude/ChatGPT-style: no avatars, no author labels. User right-aligned in subtle bubble (78% max-width). Agent flows full-width. Tool-call cards inline under the agent message. |
| **Auth flow (onboarding)** | **Loopback redirect, OAuth-feel.** Primary path: desktop spawns `http://127.0.0.1:PORT/cb`, opens browser to `omnizen.ai/connect?app=omnidraw&cb=…&state=…`, user confirms in browser, Omnizen issues a virtual key labeled `omnidraw-{date}`, browser redirects to localhost, desktop stores key in OS keychain. Fallback: manual API-key paste (collapsed under "I already have an API key"). See [`2026-05-09-auth-flow-spec.md`](./2026-05-09-auth-flow-spec.md). |

## Phase plan

| Phase | What | How tested |
|---|---|---|
| **P0** | Pull linear-app DESIGN.md + author omnidraw/DESIGN.md | Side-by-side review |
| **P1** | `tokens.css` + `components.css` + design-system preview page | Playwright screenshot of all primitives, light + dark |
| **P2** | 12 HTML mockup screens (onboarding, main app, presentation, settings, states) | Click through, screenshot each, you review |
| **P3** | Iterate to lock | Done when you say so |
| **S0** | Repo skeleton (pnpm monorepo, branding rename, Vite SPA) | `pnpm dev` loads empty branded shell |
| **S1** | Port HTML primitives → React components consuming `tokens.css` | Same preview page, now React |
| **S2** | App shell layout (sidebar + main split chat-canvas, routing) | Click around, all empty states render |
| **S3** | Pi sidecar + chat plumbing (no canvas tools yet) | Type chat → response from DeepSeek via Omnizen |
| **S4** | Branded Excalidraw embed + Pi extension w/ canvas tools | Ask agent to draw → shapes appear |
| **S5** | Live-drawing replay (lift studio's morphdom component) | Drawing animates element-by-element in chat |
| **S6** | B3 hybrid storage (folders + SQLite) | Restart app → everything persists |
| **S7** | Skills system (skill picker + first 3 teaching skills) | Pick skill → output style changes |
| **S8** | Presentation mode L2 | Press F → fullscreen, ← → navigate |
| **S9** | Onboarding + Omnizen key flow + keychain | Wipe state, fresh-user flow works |
| **S10** | Tauri packaging + signed builds | `pnpm tauri build` → working `.app` |

## Out of v1

- Multi-user collab on canvas
- MCP server ecosystem (beyond canvas)
- Studio split-view mode (L3)
- Mobile / iPad
- Self-hosted server mode (architecture supports it; not v1)

## References

- [Option 1 design (parked)](./2026-05-09-omnidraw-option-1-pi-tauri.md)
- [Option 2 design (parked)](./2026-05-09-omnidraw-option-2-studio-fork.md)
- [Pi](https://github.com/earendil-works/pi)
- [excalidraw-studio (for live-drawing replay component)](https://github.com/CopilotKit/excalidraw-studio)
- [open-design / linear-app DESIGN.md](https://github.com/nexu-io/open-design/tree/main/design-systems/linear-app)
- [Omnizen](https://omnizen.ai) (subscription gateway)
