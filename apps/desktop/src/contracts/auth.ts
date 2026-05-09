/** Implemented partly by the Agent team (Tauri commands), consumed by Frontend. */
export interface AuthAdapter {
  /** True if a key is in keychain and verified at last check. */
  isConnected(): Promise<boolean>;

  /** Begin RFC 8628 device flow against omnizen.ai. */
  startConnect(): Promise<{ userCode: string; verificationUriComplete: string }>;

  /**
   * Poll until approved/denied/expired. Resolves once final state reached.
   * Implementation opens browser via tauri shell plugin and stores key in keychain on success.
   */
  awaitConnect(): Promise<
    | { kind: "approved" }
    | { kind: "denied" }
    | { kind: "expired" }
    | { kind: "error"; reason: string }
  >;

  /** Cancel a connect-in-progress (user clicked "Cancel"). */
  cancelConnect(): Promise<void>;

  /** Manual fallback: validate + store a pasted key. */
  storeKey(apiKey: string): Promise<{ ok: true } | { ok: false; reason: string }>;

  /** Disconnect — wipe keychain entry. */
  disconnect(): Promise<void>;
}
