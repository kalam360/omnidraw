import type { AuthAdapter } from "@/contracts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let connected = false;
let cancelled = false;

if (typeof window !== "undefined") {
  // ?connected=1 query param simulates a returning user with a stored key.
  const params = new URLSearchParams(window.location.search);
  if (params.get("connected") === "1") connected = true;
}

export const stubAuthAdapter: AuthAdapter = {
  async isConnected() {
    return connected;
  },
  async startConnect() {
    cancelled = false;
    return {
      userCode: "WXYZ-2468",
      verificationUriComplete: "https://omnizen.ai/connect?code=WXYZ-2468",
    };
  },
  async awaitConnect() {
    await sleep(3000);
    if (cancelled) return { kind: "denied" } as const;
    connected = true;
    return { kind: "approved" } as const;
  },
  async cancelConnect() {
    cancelled = true;
  },
  async storeKey(apiKey: string) {
    if (!apiKey.startsWith("omn_")) return { ok: false, reason: "Key must start with omn_" };
    connected = true;
    return { ok: true };
  },
  async disconnect() {
    connected = false;
  },
};
