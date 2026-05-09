import { tmpdir } from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

import { createStorage } from "../index.js";
import type { SqliteStorageAdapter } from "../adapter.js";

export interface TestEnv {
  storage: SqliteStorageAdapter;
  rootPath: string;
  cleanup: () => void;
}

/** Create an isolated storage instance backed by a fresh tmp directory. */
export function makeTestStorage(): TestEnv {
  const rootPath = mkdtempSync(path.join(tmpdir(), "omnidraw-storage-"));
  const storage = createStorage({ rootPath });
  return {
    storage,
    rootPath,
    cleanup: () => {
      try {
        storage.close();
      } catch {}
      rmSync(rootPath, { recursive: true, force: true });
    },
  };
}
