import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "yaml";

export function runCheckRefs(booksDir: string): void {
  const files = globSync(`${booksDir}/**/*.yaml`).map((f) => resolve(f));
  const knownIds = new Set<string>();
  const entries: Array<{ id: string; connections: Array<{ book_id: string }> }> = [];

  for (const file of files) {
    try {
      const data = parse(readFileSync(file, "utf-8")) as {
        id?: string;
        connections?: Array<{ book_id: string }>;
      };
      if (data.id) {
        knownIds.add(data.id);
        entries.push({ id: data.id, connections: data.connections ?? [] });
      }
    } catch {
      console.warn(`SKIP: ${basename(file)} — parse error`);
    }
  }

  let broken = 0;
  for (const entry of entries) {
    for (const conn of entry.connections) {
      if (!knownIds.has(conn.book_id)) {
        console.error(`BROKEN REF: ${entry.id} → ${conn.book_id} (not found)`);
        broken++;
      }
    }
  }

  if (broken === 0) {
    console.log(`All ${entries.length} book connections valid ✓`);
  } else {
    console.error(`\n${broken} broken reference(s) found`);
    process.exit(1);
  }
}
