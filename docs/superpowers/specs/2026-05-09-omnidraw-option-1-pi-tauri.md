# Omnidraw — Option 1: Pi + Tauri assembly

**Status**: brainstorming, parked while exploring Option 2
**Date**: 2026-05-09

## Goal

A desktop teacher's cockpit for live YouTube classes: branded Excalidraw canvas, AI chat sidebar that drives visualizations onto the canvas, project/thread management, presentation-friendly. Open-source (AGPL), monetized indirectly via Omnizen subscription (users bring their Omnizen API key for DeepSeek / Kimi / GLM / Qwen / MiniMax).

## Architecture

```
[ Tauri 2 shell (Rust) ]
   │
   ├── webview ── [ branded Excalidraw canvas (forked omnidraw repo) ]    ←─┐
   │                                                                        │  Tauri IPC
   └── sidecar ── [ Node: Pi agent-core ]                                   │
                       │                                                    │
                       │  imports @earendil-works/pi-agent-core             │
                       │  imports @earendil-works/pi-ai                     │
                       │                                                    │
                       ├─ omnidraw extension  ──────────────────────────────┘
                       │   registers tools: create_scene, add_element,
                       │     update_element, snapshot, export_image, …
                       │
                       ├─ omnidraw skills (SKILL.md, on-demand loaded)
                       │   teaching workflows: explainer, scene-deck, refine
                       │
                       └─ pi-ai → Omnizen (Anthropic-compat) → DeepSeek / Kimi / …
```

## Locked-in choices

| Concern | Choice | Why |
|---|---|---|
| **Architecture** | Assemble: Tauri shell + branded canvas + Pi sidecar + canvas-tools extension | Reuses upstream Excalidraw without forking it deeply; loosely-coupled sidecar. |
| **License** | AGPL-3.0 | Aligns with monetization-via-Omnizen-subscription model; prevents hosted clones. |
| **Agent** | Pi (`@earendil-works/pi-agent-core` + `pi-ai`) embedded as **SDK**, not CLI subprocess | Direct event hooks for chat sidebar, tool-call interception for canvas, tighter UX. |
| **MCP** | **Not used for canvas**. Canvas tools are a Pi extension talking to canvas via Tauri IPC. Optional `pi-mcp-adapter` later for external tools (web search, Notion, etc). | Pi explicitly doesn't ship MCP. We own the canvas, so MCP indirection is unneeded; saves context tokens; keeps door open for opt-in MCP later. |
| **Provider** | Omnizen (Anthropic-compatible base URL) | Already supports `claude-3-5-sonnet-*` aliasing → DeepSeek/Kimi; lists Claude Code in compat table; per-user virtual keys. |
| **Data model** | B3 hybrid: per-project folders with `.excalidraw` scenes + SQLite for threads/metadata/cross-references | Scenes are first-class portable files (shareable, git-able); threads/sessions/tags get DB structure for fast search. |
| **Excalidraw upstream divergence** | Minimal — branding rebrand to "Omnidraw" only. Strip Firebase / socket.io collab / Excalidraw+ exports. Easy upstream merges. | The cloned `omnidraw` repo's job is just being the canvas component, not a fork divergence. |

## Open questions still to resolve

1. **Presentation mode scope** — L1 (just fullscreen), L2 (scene deck/queue), L3 (studio split-view)? *Recommended: L2.*
2. **Excalidraw collab/Firebase** — keep / strip / defer? *Recommended: strip.*

## What's intentionally out of v1

- Multi-user real-time collab on canvas (defer; can rebuild on Omnizen identity later)
- MCP server ecosystem (defer; add `pi-mcp-adapter` when a real need shows up)
- Studio-mode split view (defer to v2)
- Mobile / iPad
- Self-hosted server mode (the architecture cleanly *can* split into local-server + thin-client later, but v1 is single-app sidecar)

## Repo layout (proposed)

```
omnidraw/                              # the cloned excalidraw fork, becomes the canvas component
├── packages/                          # upstream Excalidraw packages (untouched, branded)
├── excalidraw-app/                    # upstream web app (rebranded, Firebase stripped)
├── apps/
│   ├── desktop/                       # NEW — Tauri 2 shell (Rust)
│   │   ├── src-tauri/                 # Rust: window, IPC, sidecar supervisor
│   │   └── src/                       # webview React app (chat sidebar + canvas host)
│   └── pi-host/                       # NEW — Node sidecar
│       ├── src/extension.ts           # omnidraw Pi extension (canvas tools)
│       └── skills/                    # omnidraw skills (SKILL.md + helpers)
└── docs/
    └── superpowers/specs/             # design docs
```

## Effort estimate (rough)

- Tauri shell + sidecar supervisor + IPC plumbing: ~1 week
- Pi sidecar + canvas-tools extension + first 2-3 skills: ~1 week
- Branded canvas integration (omnidraw build, Firebase strip, embed in shell): ~3-4 days
- Hybrid storage (folder + SQLite, browser UI): ~1 week
- Presentation mode L2 (scene deck): ~3-4 days
- Onboarding + Omnizen key flow + settings: ~2-3 days
- Polish, packaging, CI: ~1 week

**Total**: ~5-6 weeks for a capable v1.

## Key risks

- **Pi API churn** — Pi is young; embedding `pi-agent-core` as a library means we eat breaking changes. Mitigation: pin version, contribute upstream when needed, keep the omnidraw extension small.
- **Omnizen aliasing quality for tool-use** — DeepSeek/Kimi tool-calling reliability via Anthropic-compat translation is the unknown. Mitigation: test with the actual Excalidraw tool calls before committing skill design.
- **Tauri Node-sidecar packaging** — bundling Node runtime + npm deps for a sidecar is fiddly cross-platform. Mitigation: use `pkg`/`bun build --compile` to ship a single binary sidecar.

## References

- Pi: <https://github.com/earendil-works/pi>
- Pi philosophy "No MCP": <https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/>
- Tauri 2 sidecar pattern: <https://v2.tauri.app/develop/sidecar/>
- Omnizen: `~/dev/omnizen-ai` (private repo, Anthropic-compat at `api.omnizen.ai/v1`)
- Excalidraw MCP tool design (for borrowing patterns): <https://github.com/excalidraw/excalidraw-mcp>, <https://github.com/yctimlin/mcp_excalidraw>
