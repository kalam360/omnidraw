/**
 * Typed error envelope shared by storage adapters (real + stubs).
 *
 * Frontend matches on `instanceof StorageNotFoundError` so callers don't
 * have to grep error-message strings.
 */

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class StorageNotFoundError extends StorageError {
  /** What kind of resource was missing — useful for UI messaging. */
  readonly kind: "project" | "scene" | "thread" | "setting" | "unknown";
  /** The id (or composite key) that wasn't found. */
  readonly key: string;

  constructor(
    kind: StorageNotFoundError["kind"],
    key: string,
    message?: string,
  ) {
    super(message ?? `${kind} not found: ${key}`);
    this.name = "StorageNotFoundError";
    this.kind = kind;
    this.key = key;
  }
}
