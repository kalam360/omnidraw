# Team AGENT — prompt-spec

**Date**: 2026-05-09
**Owner**: one agent in an isolated worktree
**Branch**: `feat/omnidraw-team-agent` off `feat/omnidraw-foundation`
**Worktree**: `/Users/kalam/dev/omnidraw.worktrees/agent`
**Owns folder**: `apps/desktop/src/agent/` + the `apps/desktop/src-tauri/` auth commands (when Tauri is added; for now stub)
**Implements contracts**: `ChatModelAdapter`, `SkillRegistry`, parts of `AuthAdapter`

## Mission

Stand up the AI side of omnidraw:

- Embed Pi as an SDK (`@earendil-works/pi-agent-core` + `pi-ai`) and
  point it at Omnizen
- Implement `ChatModelAdapter` so the Frontend team's assistant-ui
  runtime can stream chat
- Implement the omnidraw Pi extension that registers canvas tools the
  agent calls into via the `CanvasController` injected by Frontend
- Implement `SkillRegistry` + the first three teaching skills
  (Diagram explainer, Scene deck builder, Refine current scene)
- Implement the RFC 8628 device-flow client for the omnizen `/connect`
  endpoint (server-side already exists on omnizen-ai's
  `feat/hermes-port`)

This is **Segments 3, 7, and the desktop side of 9** combined.

## Architectural shape

```
apps/desktop/src/agent/
├── index.ts                      # createAgent() factory
├── pi.ts                         # Pi agent-core wiring
├── omnizen-provider.ts           # pi-ai provider configured for omnizen.ai/v1
├── adapter.ts                    # ChatModelAdapter implementation
├── extension.ts                  # omnidraw Pi extension (registers canvas tools)
├── skills/
│   ├── registry.ts               # SkillRegistry implementation
│   ├── diagram-explainer/
│   │   └── SKILL.md              # system prompt + behaviour
│   ├── scene-deck-builder/
│   │   └── SKILL.md
│   └── refine-current-scene/
│       └── SKILL.md
├── auth/
│   ├── device-flow.ts            # POST /api/cli/auth/start, poll /poll
│   ├── keychain.ts               # for now: file-based storage; Tauri keyring later
│   └── adapter.ts                # AuthAdapter implementation
└── __tests__/
    ├── adapter.test.ts
    ├── extension.test.ts
    └── auth.test.ts
```

## Pi as SDK — wiring

```ts
// pi.ts
import { createAgent as piCreateAgent } from "@earendil-works/pi-agent-core";
import { createOmnizenProvider } from "./omnizen-provider";
import { omnidrawExtension } from "./extension";

export function createPi(opts: { apiKey: string; baseUrl: string; canvas: CanvasController }) {
  return piCreateAgent({
    provider: createOmnizenProvider({ apiKey: opts.apiKey, baseUrl: opts.baseUrl }),
    extensions: [omnidrawExtension({ canvas: opts.canvas })],
    // built-in tools we want: read/edit/bash off (Pi defaults), keep ours only
    tools: { builtin: [] },
  });
}
```

`pi-ai` exposes a `createAnthropicProvider({ apiKey, baseUrl })` —
point it at `https://api.omnizen.ai/v1`. That's it. Omnizen aliases
`claude-3-5-sonnet-*` model names to credible Chinese equivalents
(DeepSeek/Kimi/etc.) automatically.

## ChatModelAdapter implementation

The contract is in `contracts/chat.ts`. Translate Pi's events to the
`ChatStreamEvent` discriminated union:

```ts
class OmnidrawChatAdapter implements ChatModelAdapter {
  async *send(input) {
    const pi = await getPiSingleton();
    const skill = input.skillId ? await skills.get(input.skillId) : null;
    const systemPrompt = skill ? await skill.loadBody() : DEFAULT_SYSTEM;

    for await (const ev of pi.run({
      systemPrompt,
      messages: input.messages,
      canvas: input.canvas,  // injected into the extension
    })) {
      switch (ev.type) {
        case "token": yield { type: "token", messageId: ev.msgId, delta: ev.delta }; break;
        case "tool_call_start": yield { type: "tool_call_start", messageId: ev.msgId, tool: ev.tool }; break;
        case "tool_call_end": yield { type: "tool_call_complete", messageId: ev.msgId, toolId: ev.toolId, result: ev.result }; break;
        case "done": yield { type: "message_complete", messageId: ev.msgId };
      }
    }
  }
  async cancel(threadId: string) { /* signal Pi runtime */ }
  async ping() {
    const r = await fetch(`${baseUrl}/messages`, { method: "POST", headers: { "x-api-key": apiKey, ... }, body: JSON.stringify(pingPayload) });
    return r.ok ? { ok: true, model: "deepseek-v4-pro" } : { ok: false, reason: `${r.status}` };
  }
}
```

## omnidraw Pi extension — canvas tools

Pi extensions register tools via `pi.registerTool({ name, schema, run })`.
We expose:

| Tool name | Purpose | Args | Returns |
|---|---|---|---|
| `create_scene` | New scene from a list of elements | `{ title, elements }` | `{ sceneId }` |
| `add_elements` | Append to current scene | `{ elements }` | `{ count }` |
| `update_elements` | Patch existing elements | `{ patches: [{ id, ...partial }] }` | `{ count }` |
| `remove_elements` | Delete by id | `{ ids }` | `{ count }` |
| `get_scene` | Read current scene (for refine skill) | `{}` | `{ elements, meta }` |
| `snapshot_scene` | PNG snapshot for visual reasoning | `{}` | `{ pngBase64, width, height }` |

Each tool's `run` calls into `CanvasController` (passed via extension
factory). The Frontend team will instantiate Pi with the canvas
controller from the `OmnidrawCanvas` ref.

Tool argument schemas: use Pi's preferred schema format (likely Zod;
check `pi-agent-core` types for the exact shape).

## Skills (S7)

Three skills for v1, each a `SKILL.md` file with:

- YAML frontmatter: `name`, `description`, `icon`, `shortcut`
- Body: the system prompt + behaviour rules

Style: short, opinionated. Borrow pacing from
`apps/cli/src/...` patterns in omnizen-ai's `feat/hermes-port` branch
(reference, not to copy).

**Diagram explainer** — generate one focused scene, color-coded by
element role, hand-drawn feel, minimal labels.

**Scene deck builder** — generate a sequence of N scenes for a topic
of given length. Always asks for the topic + length first if
ambiguous. Outputs scenes one at a time with `create_scene`.

**Refine current scene** — calls `get_scene` first to read the
current canvas, then iterates with `update_elements`. Best for
"clean up", "add legend", "reduce density" requests.

`SkillRegistry.list()` walks the `skills/` directory at startup,
parses frontmatter + caches manifests. `loadBody()` reads the
markdown body on demand (Pi philosophy: load skill content only when
the user picks it).

## Auth — RFC 8628 device flow client (S9, agent half)

omnizen-ai already implements the server side. You implement the
client. See the auth-flow spec for full protocol:

```
/Users/kalam/dev/omnidraw.worktrees/agent/docs/superpowers/specs/2026-05-09-auth-flow-spec.md
```

Functions:

```ts
export async function startConnect(): Promise<{ deviceCode, userCode, verificationUriComplete, expiresIn }> {
  const r = await fetch("https://api.omnizen.ai/api/cli/auth/start", {
    method: "POST",
    headers: { "User-Agent": `omnidraw/${version}` },
  });
  return r.json();
}

export async function pollUntilApproved(deviceCode: string, opts?: { signal?: AbortSignal }): Promise<PollResult> {
  while (true) {
    if (opts?.signal?.aborted) return { kind: "cancelled" };
    const r = await fetch("https://api.omnizen.ai/api/cli/auth/poll", { ... });
    const body = await r.json();
    if (body.status === "approved") return { kind: "approved", apiKey: body.api_key, baseUrl: body.base_url };
    if (body.status === "expired") return { kind: "expired" };
    if (body.status === "denied") return { kind: "denied" };
    if (body.status === "slow_down") { await sleep(body.retry_after_ms); continue; }
    await sleep(2000);
  }
}
```

`AuthAdapter.startConnect()` returns the `userCode` +
`verificationUriComplete` so the Frontend's connecting screen can
display the code and the Tauri shell can open the URL. The Tauri
command for opening the browser will be added in S10 — for v1 in
the SPA, use `window.open(url, "_blank")` as a fallback.

Storage of the api_key:

- v1 (web/SPA): write to `~/omnidraw/library.db` settings table
  via `StorageAdapter.setSetting("omnizen.apiKey", apiKey)` —
  cooperate with the Storage team's contract
- v2 (Tauri): switch to `tauri-plugin-keyring` — added in S10

Document the v1→v2 migration path in `auth/keychain.ts`.

## Hard constraints

- **Don't touch** anything outside `apps/desktop/src/agent/` and the
  small set of deps in `apps/desktop/package.json` you need
  (`@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`).
- **Read but don't modify** `contracts/`. If you need a contract
  change, raise it in your final report — don't unilaterally edit.
- **Don't push** the branch.
- **One commit** at the end:

  ```
  feat(agent): Pi SDK + Omnizen provider + canvas tools + 3 skills + device-flow auth

  - Embed @earendil-works/pi-agent-core; route through Omnizen via pi-ai
    Anthropic-compat provider
  - Pi extension registering create_scene, add_elements, update_elements,
    remove_elements, get_scene, snapshot_scene tools (S4-aligned)
  - SkillRegistry + diagram-explainer, scene-deck-builder,
    refine-current-scene skills (S7)
  - RFC 8628 device-flow client for omnizen.ai/api/cli/auth/{start,poll}
    (desktop half of S9)

  Closes Segments 3, 7, and S9 (agent half) of the parallel plan.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

## Acceptance criteria

- `pnpm --filter omnidraw-desktop test:agent` passes
- Mock Pi run with a fake provider yields a sensible
  `ChatStreamEvent` sequence (token → tool_call_start → tool_call_complete → message_complete)
- The omnidraw extension's `create_scene` tool, given a stub
  `CanvasController`, calls `setScene` with the right element shape
- All three skills are loadable; their YAML frontmatter parses
- Device-flow client integration test using a mock fetch:
  start → poll(pending) × 3 → poll(approved) → returns api_key

## Reporting back

Under 200 words:
- Branch + commit hash
- Worktree path
- Acceptance criteria results
- Any contract changes you needed (raise as questions)
- Pi version pinned + reasons
- Anything the Frontend team needs to know to plug
  `OmnidrawChatAdapter` into assistant-ui's runtime
- Skill-prompt design notes (any deviation from Diagram explainer's
  description in the locked decisions doc)

## Frictions to expect

- **Pi's interactive TUI vs SDK use** — `pi-coding-agent` is
  TUI-first. Make sure you import from `pi-agent-core` (the headless
  runtime), not `pi-coding-agent` (the CLI). Verify by checking the
  package's main exports.
- **pi-ai's Anthropic provider config** — confirm the param name for
  base URL (probably `baseUrl` or `apiBaseUrl`). If pi-ai's Anthropic
  provider doesn't expose a base-URL override, write a thin custom
  provider that posts to omnizen.ai/v1/messages directly with the
  same response shape.
- **Skills as files vs. compiled-in** — for v1, skills are filesystem
  files in `skills/`. In a packaged Tauri app the file paths change
  (resources dir vs userdata dir). Document this in `skills/registry.ts`
  and stub the path resolution; S10 fixes it for real.
- **Device-flow CORS** — the omnizen `/api/cli/auth/*` routes are
  cross-origin from the SPA's dev server. Either run dev against
  `localhost:3001` proxy or expect Tauri's HTTP plugin to handle it
  in S10. For v1 SPA dev, document the workaround.

Begin.
