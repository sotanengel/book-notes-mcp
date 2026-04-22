import { globSync } from "node:fs";
import { resolve } from "node:path";
import { indexBookFile } from "../../indexer/book-indexer.js";
import { openDb } from "../../indexer/db.js";

export function runIndexBuild(dbPath: string, booksDir: string): void {
  const db = openDb(dbPath);
  const files = globSync(`${booksDir}/**/*.yaml`).map((f) => resolve(f));

  if (files.length === 0) {
    console.log("No YAML files found in", booksDir);
    return;
  }

  let indexed = 0;
  let skipped = 0;
  const start = Date.now();

  for (const file of files) {
    try {
      indexBookFile(db, file);
      indexed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`SKIP: ${file} — ${msg}`);
      skipped++;
    }
  }

  db.pragma("vacuum");
  db.close();

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(
    `\nIndexed ${indexed} books, skipped ${skipped} — ${elapsed}s → ${dbPath}`
  );
}

export function runIndexStatus(dbPath: string): void {
  const db = openDb(dbPath, true);
  const bookCount = (db.prepare("SELECT COUNT(*) as n FROM books").get() as { n: number }).n;
  const hlCount = (
    db.prepare("SELECT COUNT(*) as n FROM highlights").get() as { n: number }
  ).n;
  const acCount = (
    db.prepare("SELECT COUNT(*) as n FROM action_items").get() as { n: number }
  ).n;
  db.close();

  console.log(`Books:       ${bookCount}`);
  console.log(`Highlights:  ${hlCount}`);
  console.log(`Actions:     ${acCount}`);
}
