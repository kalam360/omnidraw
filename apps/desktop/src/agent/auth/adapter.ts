/**
 * `AuthAdapter` implementation. Combines:
 *   - `device-flow.ts` (transport)
 *   - `keychain.ts` (persistence)
 *   - a UI hook for opening the browser (`openBrowser`)
 *
 * The Frontend team consumes this adapter from the connecting screen.
 */

import type { AuthAdapter } from "../../contracts/auth";
import {
  pollUntilApproved,
  startConnect,
  type DeviceFlowOptions,
} from "./device-flow";
import type { KeyStore } from "./keychain";

export interface OmnidrawAuthAdapterOptions extends DeviceFlowOptions {
  /** Where to persist the api key + base URL. */
  store: KeyStore;
  /**
   * Open the browser at `verificationUriComplete`. In the SPA this
   * defaults to `window.open(url, "_blank")`. In Tauri (S10) the
   * caller passes the `tauri-plugin-shell::open` command.
   */
  openBrowser?: (url: string) => void | Promise<void>;
  /**
   * Verify the api_key is real before persisting. Defaults to a
   * cheap Anthropic-compat `/messages` ping.
   */
  validate?: (apiKey: string, baseUrl: string) => Promise<boolean>;
  /** Default poll interval in ms (only used if server doesn't say). */
  defaultPollIntervalMs?: number;
}

export function createOmnidrawAuthAdapter(
  opts: OmnidrawAuthAdapterOptions,
): AuthAdapter {
  let pendingAbort: AbortController | null = null;

  // Ferry the connect result from `startConnect` through `awaitConnect`.
  let pendingResolver:
    | ((res: Awaited<ReturnType<AuthAdapter["awaitConnect"]>>) => void)
    | null = null;
  let pendingPromise:
    | Promise<Awaited<ReturnType<AuthAdapter["awaitConnect"]>>>
    | null = null;

  const validate = opts.validate ?? defaultValidate;
  const openBrowser = opts.openBrowser ?? defaultOpenBrowser;

  return {
    async isConnected() {
      const rec = await opts.store.load();
      return Boolean(rec?.apiKey);
    },

    async startConnect() {
      // Cancel any in-flight connect.
      if (pendingAbort) pendingAbort.abort();
      pendingAbort = new AbortController();

      const flow = await startConnect({
        authBase: opts.authBase,
        userAgent: opts.userAgent,
        fetch: opts.fetch,
      });

      // Fire-and-forget the polling loop. `awaitConnect` returns the
      // promise this resolves.
      pendingPromise = new Promise((resolve) => {
        pendingResolver = resolve;
      });

      void (async () => {
        try {
          await openBrowser(flow.verificationUriComplete);
        } catch {
          /* non-fatal — the user can still copy the URL by hand */
        }
        const result = await pollUntilApproved(flow.deviceCode, {
          authBase: opts.authBase,
          userAgent: opts.userAgent,
          fetch: opts.fetch,
          signal: pendingAbort?.signal,
          defaultIntervalMs:
            opts.defaultPollIntervalMs ?? flow.interval * 1000,
        });

        if (result.kind === "approved") {
          const ok = await validate(result.apiKey, result.baseUrl).catch(
            () => false,
          );
          if (!ok) {
            pendingResolver?.({
              kind: "error",
              reason: "Returned key did not validate against Omnizen",
            });
          } else {
            await opts.store.save({
              apiKey: result.apiKey,
              baseUrl: result.baseUrl,
              storedAt: new Date().toISOString(),
            });
            pendingResolver?.({ kind: "approved" });
          }
        } else if (result.kind === "denied") {
          pendingResolver?.({ kind: "denied" });
        } else if (result.kind === "expired") {
          pendingResolver?.({ kind: "expired" });
        } else if (result.kind === "cancelled") {
          pendingResolver?.({ kind: "cancelled" });
        } else {
          pendingResolver?.({ kind: "error", reason: result.reason });
        }

        pendingResolver = null;
        pendingAbort = null;
      })();

      return {
        userCode: flow.userCode,
        verificationUriComplete: flow.verificationUriComplete,
      };
    },

    async awaitConnect() {
      if (!pendingPromise) {
        return { kind: "error", reason: "no connect in progress" };
      }
      const result = await pendingPromise;
      pendingPromise = null;
      return result;
    },

    async cancelConnect() {
      pendingAbort?.abort();
      pendingResolver?.({ kind: "cancelled" });
      pendingResolver = null;
      pendingAbort = null;
      pendingPromise = null;
    },

    async storeKey(apiKey: string) {
      const baseUrl = "https://api.omnizen.ai/v1";
      const ok = await validate(apiKey, baseUrl).catch(() => false);
      if (!ok) {
        return { ok: false, reason: "Key did not validate" };
      }
      await opts.store.save({
        apiKey,
        baseUrl,
        storedAt: new Date().toISOString(),
      });
      return { ok: true };
    },

    async disconnect() {
      pendingAbort?.abort();
      pendingAbort = null;
      pendingPromise = null;
      pendingResolver = null;
      await opts.store.clear();
    },
  };
}

async function defaultValidate(
  apiKey: string,
  baseUrl: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function defaultOpenBrowser(url: string): void {
  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  // Outside a browser (Tauri sidecar/Node tests), do nothing — the
  // caller is responsible for surfacing the URL.
}
