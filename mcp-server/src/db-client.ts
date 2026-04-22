import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env["DB_PATH"] ?? "books.db";
  const resolved = resolve(dbPath);

  if (!existsSync(resolved)) {
    throw new Error(
      `Database not found: ${resolved}\nRun: npm run index build`
    );
  }

  // Ensure path resolves to expected location (basic path traversal guard)
  const real = realpathSync(resolved);
  if (!real.endsWith(".db")) {
    throw new Error(`Invalid database path: ${resolved}`);
  }

  db = new Database(resolved, { readonly: true });
  db.pragma("foreign_keys = ON");
  return db;
}
