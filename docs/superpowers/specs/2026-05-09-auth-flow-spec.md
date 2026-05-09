# Omnidraw ↔ Omnizen — Auth Flow Spec

**Date**: 2026-05-09
**Status**: design — **omnizen-side is already built** in `feat/hermes-port` branch (RFC 8628 device-flow). Omnidraw-side implementation lives in Segment 9 of our plan.
**Owner**: omnidraw (this repo). Omnizen-side: `~/dev/omnizen-ai/` on `feat/hermes-port`.

## Goal

Let a user connect Omnidraw to their Omnizen account in one click — no
copy-paste of API keys. Equivalent to `gh auth login`, Claude Code's
login, Vercel CLI.

## Reuse what's there: omnizen-ai already implements RFC 8628 device flow

Verified in `origin/feat/hermes-port`:

| File | Purpose |
|---|---|
| `apps/web/src/app/api/cli/auth/start/route.ts` | Issue `device_code` + `user_code` |
| `apps/web/src/app/api/cli/auth/poll/route.ts` | Long-poll for approval, return `api_key` + `base_url` on success |
| `apps/web/src/app/api/cli/auth/approve/route.ts` | Clerk-protected approve action from the consent page |
| `apps/web/src/app/connect/page.tsx` + `ApproveForm.tsx` | The browser-side consent UI |
| `scripts/11-cli-pending-auths.sql` | `cli_pending_auths` table |
| `apps/cli/src/login.mjs` | Reference client implementation in Node |

It's the OAuth 2.0 Device Authorization Grant (RFC 8628) — the right
pattern for desktop apps that aren't bound to a single redirect URI.
The same backend already serves the `omnizen` npm CLI; Omnidraw just
becomes a second client of the same protocol.

## Protocol

```
[ Omnidraw desktop ]                    [ omnizen.ai ]                   [ User's browser ]

1. User clicks "Connect with Omnizen"

2. Tauri core POSTs:
     POST /api/cli/auth/start
     Headers:
       User-Agent: omnidraw/{version}
                                   ──►  Validates rate limit (30/hr/IP)
                                        Generates:
                                          device_code (256-bit secret)
                                          user_code   (8 char, XXXX-XXXX)
                                        Inserts row into cli_pending_auths
                                          with status='pending'
                                        Returns {
                                  ◄──     device_code,
                                          user_code,
                                          verification_uri:           "https://omnizen.ai/connect",
                                          verification_uri_complete:  "https://omnizen.ai/connect?code=XXXX-XXXX",
                                          interval: 2,
                                          expires_in: 600
                                        }

3. Tauri stores device_code in memory.
   Displays user_code on the "connecting" screen
   so the user can verify it matches what's
   shown in the browser.

4. Tauri opens the browser via
   tauri-plugin-shell::open(verification_uri_complete)
                                                                       ──►  GET /connect?code=XXXX-XXXX
                                                                            (Clerk middleware: sign in if needed)
                                                                            Page renders:
                                                                              - the code prefilled
                                                                              - origin metadata: IP, UA
                                                                                ("Approving omnidraw/0.1.0 from 1.2.3.4")
                                                                              - [Approve] [Cancel] buttons

                                                                            User clicks Approve

                                                                            Browser POSTs:
                                                                            POST /api/cli/auth/approve
                                                                            Body { user_code: "XXXX-XXXX" }
                                                                            (Clerk-authenticated)
                                                                       ◄──
                                        Marks row 'approved',
                                        sets user_id = clerk user
                                        (Phone-OTP gate may run for Free tier)

                                                                            Page renders "✓ Approved — return to Omnidraw"

5. Meanwhile Tauri has been polling every 2s:
     POST /api/cli/auth/poll
     Body { device_code }

   Responses (in order they typically arrive):
     200 { status: "pending" }                  ← while user is still signing in / clicking
     200 { status: "pending" }
     200 { status: "pending" }
     200 { status: "approved",                  ← first poll AFTER user approves
            api_key: "omn_live_xxx",
            base_url: "https://api.omnizen.ai/v1" }

   Edge cases:
     410 { status: "expired" }   ← TTL elapsed; restart the flow
     410 { status: "denied" }    ← user clicked Cancel; offer to try again
     429 { status: "slow_down",  ← polled too fast; back off per retry_after_ms
            retry_after_ms }

6. On 'approved':
   - Validate api_key works with a no-op call to Omnizen (defense in depth)
   - Store via tauri-plugin-keyring: { service: "omnidraw", account: "omnizen", password: api_key }
   - Store base_url in app config (it's not secret)
   - Stop polling
   - Advance UI to next onboarding step

7. On 'expired'/'denied':
   - Show recoverable error in the connecting screen
   - One-click "Try again" returns to step 1
```

The row is marked `consumed` after the first successful poll, so a
second poll with the same `device_code` returns `expired` — protects
against replay if logs leak.

## UI mapping (matches the prototype)

| Prototype state | Maps to |
|---|---|
| `#connect` — primary "Connect with Omnizen" button | Step 1: triggers Tauri command |
| `#connect` — "I already have an API key" disclosure | Manual fallback, `verify_and_store_key(input)` |
| `#connecting` — 3-step checklist | Steps 4–6, with status driven by poll responses |
| `#connecting` — `user_code` display | Step 3: shows the same code the browser shows for verification |
| `#connecting` — "Browser didn't open?" link | Re-opens `verification_uri_complete` |
| `#connecting` — "Cancel" button | Stop polling, return to `#connect` |

## Tauri commands needed

```rust
// apps/desktop/src-tauri/src/auth.rs (sketch)

#[tauri::command]
async fn omnizen_login_start() -> Result<DeviceFlowState> {
  let resp: StartResp = http_post("https://api.omnizen.ai/api/cli/auth/start", ...).await?;
  Ok(DeviceFlowState {
    user_code: resp.user_code,
    verification_uri_complete: resp.verification_uri_complete,
    expires_in: resp.expires_in,
  })
  // device_code stored in process memory keyed by user_code
  // shell::open(verification_uri_complete) called on the next command
}

#[tauri::command]
async fn omnizen_login_open_browser(user_code: String) -> Result<()> {
  let url = state.lookup(&user_code)?.verification_uri_complete;
  tauri::api::shell::open(&app, url, None)
}

#[tauri::command]
async fn omnizen_login_poll(user_code: String) -> Result<PollResult> {
  let device_code = state.lookup(&user_code)?.device_code;
  loop {
    let resp = http_post("https://api.omnizen.ai/api/cli/auth/poll", { device_code }).await?;
    match resp.status {
      "pending" => sleep(Duration::from_secs(2)).await,
      "slow_down" => sleep(Duration::from_millis(resp.retry_after_ms)).await,
      "approved" => {
        verify_key_works(&resp.api_key).await?;
        keyring::store("omnidraw", "omnizen", &resp.api_key)?;
        config::set("omnizen_base_url", &resp.base_url)?;
        state.clear(&user_code);
        return Ok(PollResult::Approved);
      }
      "expired" | "denied" => return Ok(PollResult::Failed(resp.status)),
    }
  }
}

#[tauri::command]
async fn omnizen_verify_key(api_key: String) -> Result<()> {
  // Manual fallback path
  verify_key_works(&api_key).await?;
  keyring::store("omnidraw", "omnizen", &api_key)?;
  Ok(())
}
```

In React (Segment 9):

```tsx
// /onboarding/connect.tsx
const [phase, setPhase] = useState<"idle"|"connecting"|"approved"|"failed">("idle");
const [userCode, setUserCode] = useState<string>();

async function connect() {
  setPhase("connecting");
  const { user_code } = await invoke<DeviceFlowState>("omnizen_login_start");
  setUserCode(user_code);
  await invoke("omnizen_login_open_browser", { userCode: user_code });
  const result = await invoke<PollResult>("omnizen_login_poll", { userCode: user_code });
  setPhase(result.kind === "Approved" ? "approved" : "failed");
}
```

## Open questions for omnizen-ai team

These are minor — confirm before we start integrating:

1. **Is `feat/hermes-port` going to merge to `main` cleanly, and on what timeline?** Our Segment 9 schedule depends on the protocol being available at `api.omnizen.ai`.
2. **The `app` parameter** — is there a way to indicate which client is logging in (`omnidraw` vs `omnizen-cli`) so the consent screen can show the right name? The schema has `origin_ua` but it's freeform; a structured `app_name` would be nicer for the UI ("Approve omnidraw" vs "Approve a generic CLI").
3. **`origin_ua` filtering** — we'll send `User-Agent: omnidraw/{version}`; will Omnizen reject unknown UAs? Probably not, but worth confirming.
4. **Free-tier phone-OTP gate** — the approve route runs `checkPhoneForFreeTier()`. Need to handle 412 in the Tauri client and show the user a "verify your phone first" message with a deep link to omnizen.ai.

## Security inheritance

We inherit all of omnizen-ai's existing protections — there's no new attack surface introduced by Omnidraw being a second client. Specifically:

- Rate limit on `/start` (30/hr/IP)
- Rate limit on `/poll` (60/min/IP, with `slow_down` per spec)
- `device_code` is 256-bit, never appears in URLs or logs
- `user_code` is short (8 char) and single-use
- Row consumed on first approved poll (replay protection)
- Origin metadata captured at start, displayed at approval (phishing resistance)
- Phone-OTP gate for Free-tier abuse
- Clerk-protected approve endpoint

Omnidraw-side adds:
- Validate `api_key` before storing (a defense-in-depth check)
- OS keychain storage only (`tauri-plugin-keyring`)
- HTTPS-only `api.omnizen.ai` connection
- No key in logs, env vars on disk, or config files

## V2 considerations

- Refresh / expiry handling — the LiteLLM key is long-lived; on 401 we route the user back to `#connect`. No silent refresh in v1.
- Re-authentication when the user wants to switch accounts — Settings → Connection → "Disconnect" + "Reconnect" pair.
- Multi-account — single account per app install in v1.

## Acceptance criteria

A user can:

1. Launch Omnidraw fresh, click "Connect with Omnizen" on the connect screen
2. See the browser auto-open to `omnizen.ai/connect?code=XXXX-XXXX`
3. Sign in to Omnizen (if not already signed in)
4. Click Approve on the consent page
5. See "✓ Connected" in Omnidraw within 2–4 seconds (one poll cycle after approval)
6. Send a chat message that successfully reaches DeepSeek/Kimi via Omnizen
7. Re-launch Omnidraw the next day and have it still connected (key persisted)

Manual fallback (paste API key) must also work for users who prefer it.

## References

- RFC 8628 — OAuth 2.0 Device Authorization Grant
- omnizen-ai branch `feat/hermes-port` — reference implementation
- `apps/cli/src/login.mjs` in that branch — Node reference client we can use as a starting point for the Rust port
- Tauri keyring plugin — <https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/keyring>
- Tauri shell plugin — <https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/shell>
