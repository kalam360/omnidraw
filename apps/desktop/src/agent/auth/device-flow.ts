/**
 * RFC 8628 device-flow client for `api.omnizen.ai/api/cli/auth/{start,poll}`.
 *
 * The omnizen-ai team's `feat/hermes-port` branch already serves the
 * server side. We are the desktop client. This file is *transport only* —
 * it does not touch a keychain or the canvas. See `adapter.ts` for the
 * `AuthAdapter` that wires it all together.
 *
 * Note on the `fetch` injection: every public function takes an
 * optional `fetch` so the integration test in `__tests__/auth.test.ts`
 * can stub responses without monkey-patching `globalThis.fetch`.
 */

import { OMNIZEN_AUTH_BASE } from "../omnizen-provider";

export interface StartConnectResult {
  /** Opaque secret only the desktop client ever sees. */
  deviceCode: string;
  /** Short code shown to the user (`XXXX-XXXX`). */
  userCode: string;
  /** URL the user is sent to to approve. */
  verificationUriComplete: string;
  /** Lifetime of the pending auth row, in seconds. */
  expiresIn: number;
  /** Polling interval the server suggests (seconds). Default 2. */
  interval: number;
}

export type PollResult =
  | {
      kind: "approved";
      apiKey: string;
      baseUrl: string;
    }
  | { kind: "expired" }
  | { kind: "denied" }
  | { kind: "cancelled" }
  | { kind: "error"; reason: string };

export interface DeviceFlowOptions {
  /** Override the base URL for tests. */
  authBase?: string;
  /** UA string sent to omnizen. */
  userAgent?: string;
  /** Injected `fetch`. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

export interface PollOptions extends DeviceFlowOptions {
  /** Cancel the long poll. */
  signal?: AbortSignal;
  /** Inject a sleeper (tests). Default `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Default poll interval in ms (only used if server doesn't say). */
  defaultIntervalMs?: number;
}

const DEFAULT_UA = "omnidraw/0.0.0";

/** POST `/api/cli/auth/start`. */
export async function startConnect(
  opts: DeviceFlowOptions = {},
): Promise<StartConnectResult> {
  const base = opts.authBase ?? OMNIZEN_AUTH_BASE;
  const f = opts.fetch ?? fetch;
  const res = await f(`${base}/start`, {
    method: "POST",
    headers: {
      "User-Agent": opts.userAgent ?? DEFAULT_UA,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ app: "omnidraw" }),
  });
  if (!res.ok) {
    throw new Error(`startConnect: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri?: string;
    verification_uri_complete: string;
    expires_in: number;
    interval?: number;
  };
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUriComplete: body.verification_uri_complete,
    expiresIn: body.expires_in,
    interval: body.interval ?? 2,
  };
}

/**
 * Poll `/api/cli/auth/poll` until the row reaches a terminal state.
 *
 * Backoff:
 * - default interval is 2s (configurable via `defaultIntervalMs`)
 * - server may return `slow_down` with `retry_after_ms` — honoured
 * - aborted signal cleanly resolves with `{ kind: "cancelled" }`
 */
export async function pollUntilApproved(
  deviceCode: string,
  opts: PollOptions = {},
): Promise<PollResult> {
  const base = opts.authBase ?? OMNIZEN_AUTH_BASE;
  const f = opts.fetch ?? fetch;
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  let intervalMs = opts.defaultIntervalMs ?? 2000;

  // First quick check, then loop.
  while (true) {
    if (opts.signal?.aborted) return { kind: "cancelled" };
    let res: Response;
    try {
      res = await f(`${base}/poll`, {
        method: "POST",
        headers: {
          "User-Agent": opts.userAgent ?? DEFAULT_UA,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ device_code: deviceCode }),
        signal: opts.signal,
      });
    } catch (err) {
      if (opts.signal?.aborted) return { kind: "cancelled" };
      return {
        kind: "error",
        reason: err instanceof Error ? err.message : String(err),
      };
    }

    // 410 Gone is documented as the terminal expired/denied response.
    if (res.status === 410) {
      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
      };
      if (body.status === "denied") return { kind: "denied" };
      return { kind: "expired" };
    }
    if (!res.ok) {
      return {
        kind: "error",
        reason: `${res.status} ${res.statusText}`,
      };
    }

    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      api_key?: string;
      base_url?: string;
      retry_after_ms?: number;
    };

    if (body.status === "approved") {
      if (!body.api_key || !body.base_url) {
        return {
          kind: "error",
          reason: "approved response missing api_key or base_url",
        };
      }
      return {
        kind: "approved",
        apiKey: body.api_key,
        baseUrl: body.base_url,
      };
    }
    if (body.status === "denied") return { kind: "denied" };
    if (body.status === "expired") return { kind: "expired" };

    if (body.status === "slow_down" && body.retry_after_ms) {
      intervalMs = body.retry_after_ms;
    }

    await sleep(intervalMs);
  }
}
