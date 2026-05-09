import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import Database from "better-sqlite3";

import { runMigrations } from "../migrations/index.js";
import { makeTestStorage, type TestEnv } from "./helpers.js";

describe("migrations", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = makeTestStorage();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("runs idempotently on a fresh database", () => {
    // first run already happened during makeTestStorage(); close and re-run
    // against the same file to confirm no-op.
    env.storage.close();
    const db = new Database(path.join(env.rootPath, "library.db"));
    expect(() => runMigrations(db)).not.toThrow();
    expect(() => runMigrations(db)).not.toThrow();

    const rows = db
      .prepare("SELECT version, filename FROM _migrations ORDER BY version")
      .all() as Array<{ version: number; filename: string }>;
    // Each migration should appear exactly once.
    const versions = rows.map((r) => r.version);
    const unique = new Set(versions);
    expect(versions.length).toBe(unique.size);
    expect(versions.length).toBeGreaterThan(0);
    db.close();
  });

  it("creates the expected tables", () => {
    const db = new Database(path.join(env.rootPath, "library.db"));
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all()
      .map((r) => (r as { name: string }).name);
    for (const t of [
      "_migrations",
      "messages",
      "projects",
      "scenes",
      "settings",
      "threads",
    ]) {
      expect(tables).toContain(t);
    }
    db.close();
  });
});
