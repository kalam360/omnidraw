# Omnidraw — Option 2: Fork CopilotKit/excalidraw-studio

**Status**: brainstorming
**Date**: 2026-05-09

## Goal

Same as Option 1: a desktop teacher's cockpit for live YouTube classes. Different path: leverage [CopilotKit/excalidraw-studio](https://github.com/CopilotKit/excalidraw-studio) (MIT) which already implements the chat→Excalidraw scene-generation UX with live drawing and persistent workspaces, then add the missing pieces.

## What we inherit (≈ 60–70% of v1 UX)

| Feature | Where in studio |
|---|---|
| Chat sidebar UI | `src/app/page.tsx` + CopilotKit's `CopilotChat` |
| Multi-provider LLM (works with Omnizen as Anthropic-compat) | `src/app/api/copilotkit/route.ts` `BuiltInAgent({ model: "..." })` |
| Live drawing animation in chat | `server/src/mcp-app.tsx` (`exportToSvg` + morphdom replay) |
| Excalidraw canvas in workspace view | `src/app/workspace/[id]/` |
| Checkpoint CRUD API | `src/app/api/checkpoint/[id]/`, `src/app/api/checkpoints/` |
| Storage (filesystem, in-memory, Redis) | `server/src/checkpoint-store.ts` |
| Skills (system prompts per diagram style) | `src/skills/` |
| MCP server with `create_view` + `read_me` | `server/src/server.ts` |
| Edit-with-AI loop (load → refine → save) | `src/app/workspace/[id]/` |

## Architecture options for desktop packaging

Three sub-options for how to ship a Next.js app as a desktop app:

### 2A — Tauri webview pointed at bundled Next.js sidecar
- Tauri spawns `next start` as a sidecar on a random localhost port
- Tauri webview navigates to that port
- Pros: minimal changes to the studio code; full SSR/API routes work
- Cons: bundling Node + Next.js is heavyweight (~150 MB+), startup latency

### 2B — Convert studio to SPA + Node sidecar for the API
- Strip Next.js, keep React + CopilotKit components, build a Vite SPA
- Move API routes (CopilotKit runtime, checkpoints) to an Express/Hono sidecar
- Pros: smaller bundle, faster startup, cleaner Tauri integration
- Cons: meaningful rewrite of routing/data-fetching; we own the migration burden

### 2C — Keep studio as web-first; ship desktop later
- Run studio as the omnidraw web app first (Vercel or self-hosted)
- Add desktop later via Tauri + 2A or 2B
- Pros: ship UX fast; web access from any device
- Cons: not the desktop-app deliverable the user asked for

## Locked-in choices (carry over from Option 1)

| Concern | Choice |
|---|---|
| **License** | omnidraw additions: AGPL-3.0; CopilotKit + Excalidraw + studio code: MIT (vendored, untouched terms) |
| **Provider** | Omnizen via `BuiltInAgent({ model: "anthropic/claude-3-5-sonnet-..." })` + `ANTHROPIC_BASE_URL=https://api.omnizen.ai/v1` |
| **Data model** | B3 hybrid: per-project folders with `.excalidraw` files + SQLite for threads/metadata |

## What we still need to build on top of studio

### Must-have for v1
1. **Desktop packaging** (2A or 2B above)
2. **Project hierarchy** — replace flat checkpoint list with project → scenes structure. Studio's `checkpoint-store.ts` is the swap point.
3. **Threads model** — each project has multiple chat threads, persisted (studio is one-shot per page load). Add `threads` table to SQLite.
4. **Presentation/live mode (L2)** — fullscreen scene view with ← → navigation, "scene queue" UI.
5. **Branding** — strip "Excalidraw Studio" copy, omnidraw identity, omnizen-themed onboarding.
6. **Omnizen onboarding flow** — first-launch: paste API key, smoke-test with `/v1/messages`, store in OS keychain (Tauri's `keyring` plugin).
7. **Strip Excalidraw collab/Firebase** — the `@excalidraw/excalidraw` package itself doesn't include collab UI by default in studio's setup; verify and remove any references.

### Nice-to-have (defer)
- Studio split-view mode (L3)
- MCP server ecosystem add-ons (web search, etc)
- iPad / mobile

## What stays out of v1

Same as Option 1: multi-user collab, MCP add-ons beyond canvas, mobile, hosted server mode.

## Repo layout (proposed)

Two repos remain separate:

```
omnidraw/                              # the cloned excalidraw fork — used as the canvas component (rebrand only)
├── packages/                          # untouched
├── excalidraw-app/                    # rebranded
└── …

omnidraw-app/                          # NEW — the desktop cockpit (forked from excalidraw-studio)
├── src/                               # studio's Next.js or our SPA (depending on 2A/2B)
├── server/                            # studio's MCP server (kept) + our additions
├── apps/desktop/                      # Tauri shell wrapping the above
├── packages/
│   ├── omnidraw-skills/               # our skills (teaching-specific)
│   └── omnidraw-storage/              # SQLite + folder hybrid store, replaces studio's flat checkpoint store
└── docs/superpowers/specs/
```

Or, simpler, single repo: rename the cloned excalidraw to be the canvas package and the studio fork to be the app, but the boundary stays clean.

## Effort estimate (rough)

- Tauri shell + Next.js sidecar packaging (option 2A): ~1 week
- *or* SPA migration (option 2B): ~2 weeks
- Project hierarchy + threads + storage rewrite: ~1 week
- Presentation mode L2: ~3-4 days
- Branding + Omnizen onboarding + keychain: ~3-4 days
- Polish, packaging, CI: ~3-4 days

**Total**: ~3-4 weeks for a capable v1 (with 2A); 4-5 weeks (with 2B).

## Comparison vs Option 1

| Dimension | Option 1 (Pi + Tauri) | Option 2 (studio fork + Tauri) |
|---|---|---|
| **Time to v1** | ~5-6 weeks | **~3-4 weeks** |
| **Chat UX quality at v1** | We build it — risk of feeling janky | **Studio's UX is already validated** |
| **Live-drawing animation** | We'd build it (or live without) | **Already works** |
| **Bundle size** | Lighter (Pi sidecar ~30 MB + Tauri shell) | Heavier (Next.js + CopilotKit + sidecars ~150 MB+) |
| **Long-term flexibility** | High — Pi extension layer is small + ours | Coupled to CopilotKit framework |
| **Agent ergonomics** | Pi's "skills as CLI tools w/ READMEs" — token-efficient | CopilotKit's `BuiltInAgent` + MCP — more conventional, more verbose |
| **MCP needed?** | No (we own the canvas) | Yes (studio's architecture is built around MCP) |
| **Framework risk** | Pi is young (~46k stars, active) | CopilotKit is well-funded ($27M, MIT, AG-UI traction) |
| **Skills format** | Pi-native SKILL.md | Studio uses skills-as-system-prompts (lighter); not the same as Anthropic Skills |
| **AGPL alignment** | Clean — all our code, our license | Mixed — our additions AGPL, vendored code MIT |
| **Re-architecting later** | Easy — small surface | Harder — CopilotKit lock-in across UI + agent + runtime |

## Key risks

- **Next.js → desktop friction** — packaging is non-trivial (mitigation: 2A first, evaluate 2B later)
- **CopilotKit lock-in** — our chat UX is theirs; if they pivot or diverge, migration hurts (mitigation: keep our skills + storage layer separable; CopilotKit's React hooks are the only deep coupling)
- **Studio's MCP server is canonical to its design** — we can't easily strip it without rewriting the canvas-streaming pipeline (the live-drawing replay lives there)
- **Skill format divergence** — studio's "skills" are system-prompt files, not Anthropic Skills. If we ever want to reuse skills with Pi/Claude Code/etc, format conversion needed.

## Recommendation logic

**Pick Option 2 if**: shipping in 3-4 weeks matters more than long-term flexibility, AND CopilotKit-as-foundation is a comfortable bet.

**Pick Option 1 if**: agent-first philosophy + lightweight stack matters more than time-to-v1, AND you want skills/UX you fully control.

**Pick a Hybrid (Option 3?) if**: take studio's chat-streaming UX components but replace its agent runtime with Pi. (More work than either pure option, but maximizes the "best of both" surface. Worth a sketch if neither pure option fits.)

## References

- excalidraw-studio: <https://github.com/CopilotKit/excalidraw-studio>
- CopilotKit (framework): <https://github.com/copilotkit/copilotkit> (MIT, $27M Series, AG-UI maintainer)
- AG-UI protocol: <https://docs.ag-ui.com>
- Live-drawing replay: `server/src/mcp-app.tsx` in studio
- Studio's storage layer: `server/src/checkpoint-store.ts` (file/memory/Redis)
