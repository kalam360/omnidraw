import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all numbered SQL migrations in this folder. Idempotent: tracks
 * applied versions in a `_migrations` table.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      filename   TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const files = readdirSync(__dirname)
    .filter((f) => /^\d+-.*\.sql$/.test(f))
    .sort();

  const appliedStmt = db.prepare<[number]>(
    "SELECT 1 FROM _migrations WHERE version = ?",
  );
  const insertStmt = db.prepare(
    "INSERT INTO _migrations (version, filename, applied_at) VALUES (?, ?, ?)",
  );

  for (const file of files) {
    const version = Number.parseInt(file.split("-")[0], 10);
    if (appliedStmt.get(version)) {
      continue;
    }
    const sql = readFileSync(path.join(__dirname, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      insertStmt.run(version, file, new Date().toISOString());
    });
    apply();
  }
}
