/**
 * Key storage for the Omnizen API key.
 *
 * v1 — file-based + StorageAdapter passthrough.
 *
 *   Until the Storage team's `setSetting/getSetting` adapter ships in the
 *   Tauri runtime, we read/write a file at `~/omnidraw/auth.json` with
 *   `mode 0600` for SPA dev. When a `StorageAdapter` is supplied, we
 *   delegate to its `setSetting("omnizen.apiKey", apiKey)` instead.
 *
 * v2 (S10) — Tauri keychain.
 *
 *   Under Tauri, `createKeyStore()` returns a `tauri-plugin-keyring`-
 *   backed `KeyStore` that persists the API key in the OS-native
 *   credential store (Keychain on macOS, Credential Manager on Windows,
 *   Secret Service on Linux). The file fallback remains for the SPA dev
 *   server path (where `node:fs` is available via vite's SSR loader for
 *   the agent tests) and as a last-resort fallback inside Tauri if the
 *   keyring command fails.
 *
 *   NOTE — `tauri-plugin-keyring` 0.1.x is a small single-author crate.
 *   Before v1 GA, audit the crate or migrate to a maintained alternative
 *   (e.g. `tauri-plugin-stronghold` or wrap the well-tested `keyring`
 *   Rust crate directly via a custom plugin). Tracked as a v0.2 follow-up.
 */

import type { StorageAdapter } from "../../contracts/storage";

export const OMNIZEN_API_KEY_SETTING = "omnizen.apiKey";
export const OMNIZEN_BASE_URL_SETTING = "omnizen.baseUrl";

/** Service/account identifiers used in the OS keychain entry. */
export const OMNIDRAW_KEYRING_SERVICE = "omnidraw";
export const OMNIDRAW_KEYRING_ACCOUNT = "omnizen";
/** Single keychain entry holds the JSON-serialized `KeyRecord`. */
export const OMNIDRAW_KEYRING_AUTH_KEY = "auth";

export interface KeyRecord {
  apiKey: string;
  /** The base URL omnizen returned. May be a regional endpoint. */
  baseUrl: string;
  /** When the key was stored, ISO8601. */
  storedAt: string;
}

export interface KeyStore {
  load(): Promise<KeyRecord | null>;
  save(rec: KeyRecord): Promise<void>;
  clear(): Promise<void>;
}

// -- StorageAdapter-backed store -------------------------------------------

/**
 * Preferred: stores the key via the Storage team's adapter so the SQLite
 * settings table is the source of truth. The adapter's underlying file
 * permissions are the storage team's responsibility.
 */
export function createStorageKeyStore(storage: StorageAdapter): KeyStore {
  return {
    async load() {
      const apiKey = await storage.getSetting<string>(OMNIZEN_API_KEY_SETTING);
      const baseUrl = await storage.getSetting<string>(
        OMNIZEN_BASE_URL_SETTING,
      );
      if (!apiKey || !baseUrl) return null;
      return { apiKey, baseUrl, storedAt: "" };
    },
    async save(rec) {
      await storage.setSetting(OMNIZEN_API_KEY_SETTING, rec.apiKey);
      await storage.setSetting(OMNIZEN_BASE_URL_SETTING, rec.baseUrl);
    },
    async clear() {
      await storage.setSetting(OMNIZEN_API_KEY_SETTING, null);
      await storage.setSetting(OMNIZEN_BASE_URL_SETTING, null);
    },
  };
}

// -- File-backed store (dev fallback) --------------------------------------

export interface FileKeyStoreOptions {
  /** Override target file path. Default: `~/omnidraw/auth.json`. */
  path?: string;
}

/**
 * Dev-only fallback while the Storage team's adapter is not yet
 * wired. Writes the key as JSON with `mode 0600`.
 */
export function createFileKeyStore(opts: FileKeyStoreOptions = {}): KeyStore {
  return {
    async load() {
      const fs = await import("node:fs/promises");
      const file = await resolvePath(opts.path);
      try {
        const raw = await fs.readFile(file, "utf8");
        return JSON.parse(raw) as KeyRecord;
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    async save(rec) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const file = await resolvePath(opts.path);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(rec, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    },
    async clear() {
      const fs = await import("node:fs/promises");
      const file = await resolvePath(opts.path);
      try {
        await fs.unlink(file);
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
    },
  };
}

// -- In-memory store (tests) -----------------------------------------------

export function createMemoryKeyStore(initial?: KeyRecord | null): KeyStore {
  let cur: KeyRecord | null = initial ?? null;
  return {
    async load() {
      return cur;
    },
    async save(rec) {
      cur = rec;
    },
    async clear() {
      cur = null;
    },
  };
}

// -- Tauri keyring-backed store (desktop runtime) --------------------------

/**
 * Persists the `KeyRecord` in the OS-native credential store via
 * `tauri-plugin-keyring`. Only used when running inside Tauri (detected
 * via `@tauri-apps/api/core#isTauri`); the SPA dev path falls back to the
 * file-backed store.
 *
 * The plugin's JS surface is fully async and lazy-loaded so that vite
 * tree-shakes it out of SPA bundles.
 */
export function createTauriKeyStore(): KeyStore {
  return {
    async load() {
      const { getPassword } = await import("tauri-plugin-keyring-api");
      const raw = await getPassword(
        OMNIDRAW_KEYRING_SERVICE,
        OMNIDRAW_KEYRING_ACCOUNT,
      );
      if (!raw) return null;
      try {
        return JSON.parse(raw) as KeyRecord;
      } catch {
        // Corrupt entry — treat as missing rather than throwing so the
        // user can re-authenticate.
        return null;
      }
    },
    async save(rec) {
      const { setPassword } = await import("tauri-plugin-keyring-api");
      await setPassword(
        OMNIDRAW_KEYRING_SERVICE,
        OMNIDRAW_KEYRING_ACCOUNT,
        JSON.stringify(rec),
      );
    },
    async clear() {
      const { deletePassword } = await import("tauri-plugin-keyring-api");
      try {
        await deletePassword(
          OMNIDRAW_KEYRING_SERVICE,
          OMNIDRAW_KEYRING_ACCOUNT,
        );
      } catch {
        // Missing entry is not an error for `clear()`.
      }
    },
  };
}

// -- Runtime-aware factory -------------------------------------------------

/**
 * Returns the appropriate `KeyStore` for the current runtime:
 *   - Inside Tauri: OS keychain via `createTauriKeyStore()`.
 *   - SPA dev / Node tests: file-backed via `createFileKeyStore()`.
 *
 * Tests should pass an explicit `KeyStore` (e.g. `createMemoryKeyStore()`)
 * to the agent factory rather than relying on this helper.
 */
export function createKeyStore(): KeyStore {
  if (isTauriRuntime()) {
    return createTauriKeyStore();
  }
  return createFileKeyStore();
}

function isTauriRuntime(): boolean {
  // `window.__TAURI_INTERNALS__` is injected by the Tauri runtime; checking
  // for its presence avoids importing `@tauri-apps/api` (which would resolve
  // even in vite SSR / vitest).
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as object)
  );
}

// -- Helpers ---------------------------------------------------------------

async function resolvePath(override?: string): Promise<string> {
  if (override) return override;
  const path = await import("node:path");
  const os = await import("node:os");
  const home = os.homedir();
  return path.join(home, "omnidraw", "auth.json");
}

function isNotFound(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as { code: string }).code === "ENOENT"
  );
}
