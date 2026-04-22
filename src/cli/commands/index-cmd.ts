import { existsSync, globSync } from "node:fs";
import { resolve } from "node:path";
import { indexBookFile } from "../../indexer/book-indexer.js";
import { openDb } from "../../indexer/db.js";
import { ensureTopicSchema, indexTopicFile } from "../../indexer/topic-indexer.js";

export function runIndexBuild(dbPath: string, booksDir: string, topicsDir: string): void {
  const db = openDb(dbPath);
  ensureTopicSchema(db);

  const bookFiles = globSync(`${booksDir}/**/*.yaml`).map((f) => resolve(f));
  const topicFiles = existsSync(topicsDir)
    ? globSync(`${topicsDir}/**/*.yaml`).map((f) => resolve(f))
    : [];

  if (bookFiles.length === 0 && topicFiles.length === 0) {
    console.log("No YAML files found.");
    return;
  }

  let booksIndexed = 0;
  let topicsIndexed = 0;
  let skipped = 0;
  const start = Date.now();

  for (const file of bookFiles) {
    try {
      indexBookFile(db, file);
      booksIndexed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`SKIP: ${file} — ${msg}`);
      skipped++;
    }
  }

  for (const file of topicFiles) {
    try {
      indexTopicFile(db, file);
      topicsIndexed++;
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
    `\nIndexed ${booksIndexed} books, ${topicsIndexed} topics, skipped ${skipped} — ${elapsed}s → ${dbPath}`
  );
}

export function runIndexStatus(dbPath: string): void {
  const db = openDb(dbPath, true);
  const bookCount = (db.prepare("SELECT COUNT(*) as n FROM books").get() as { n: number }).n;
  const hlCount = (db.prepare("SELECT COUNT(*) as n FROM highlights").get() as { n: number }).n;
  const acCount = (db.prepare("SELECT COUNT(*) as n FROM action_items").get() as { n: number }).n;
  const topicCount = db.prepare("SELECT COUNT(*) as n FROM topics").get() as
    | { n: number }
    | undefined;
  db.close();

  console.log(`Books:       ${bookCount}`);
  console.log(`Highlights:  ${hlCount}`);
  console.log(`Actions:     ${acCount}`);
  console.log(`Topics:      ${topicCount?.n ?? 0}`);
}
