import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";

import { runMigrations } from "./migrations/index.js";

export type DB = Database.Database;

export interface DbHandle {
  db: DB;
  close: () => void;
}

/**
 * Open (or create) the SQLite database at the given path. Runs migrations
 * synchronously, sets pragmas tuned for our workload, and returns the
 * raw better-sqlite3 handle.
 */
export function openDatabase(dbPath: string): DbHandle {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  runMigrations(db);
  return {
    db,
    close: () => db.close(),
  };
}
