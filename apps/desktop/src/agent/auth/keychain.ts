/**
 * Key storage for the Omnizen API key.
 *
 * v1 (this implementation) — file-based + StorageAdapter passthrough.
 *
 *   Until the Storage team's `setSetting/getSetting` adapter ships,
 *   we read/write a file at `$XDG_CONFIG_HOME/omnidraw/auth.json`
 *   (falling back to `~/omnidraw/auth.json`) with `mode 0600`. When
 *   a `StorageAdapter` is supplied, we delegate to its
 *   `setSetting("omnizen.apiKey", apiKey)` instead.
 *
 * v2 (S10) — Tauri keychain.
 *
 *   Switch to `tauri-plugin-keyring` for OS-level secret storage.
 *   The migration:
 *     1. On first v2 launch, read the v1 file/setting.
 *     2. If found, write to keychain via `keyring::set("omnidraw",
 *        "omnizen", apiKey)`.
 *     3. Delete the file / clear the setting.
 *   The same `KeyStore` interface remains; only the implementation
 *   swaps.
 */

import type { StorageAdapter } from "../../contracts/storage";

export const OMNIZEN_API_KEY_SETTING = "omnizen.apiKey";
export const OMNIZEN_BASE_URL_SETTING = "omnizen.baseUrl";

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
