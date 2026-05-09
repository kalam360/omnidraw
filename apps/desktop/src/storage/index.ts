import { SqliteStorageAdapter, type CreateStorageOptions } from "./adapter.js";

export type { CreateStorageOptions } from "./adapter.js";
export { SqliteStorageAdapter } from "./adapter.js";
export { StorageError, StorageNotFoundError } from "./errors.js";

/**
 * Factory for the storage adapter. The returned instance owns a
 * better-sqlite3 handle; call `close()` when shutting down.
 */
export function createStorage(
  opts: CreateStorageOptions = {},
): SqliteStorageAdapter {
  return new SqliteStorageAdapter(opts);
}
