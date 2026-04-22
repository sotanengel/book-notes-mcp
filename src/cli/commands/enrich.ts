import { readFileSync, writeFileSync } from "node:fs";
import { globSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";
import { fetchByIsbn } from "../../enricher/openbd.js";
import { sortFields } from "../../formatter/field-sorter.js";

export async function runEnrich(patterns: string[]): Promise<void> {
  const files: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes("*") || pattern.includes("?")) {
      files.push(...globSync(pattern).map((f) => resolve(f)));
    } else {
      const resolved = resolve(pattern);
      try {
        if (statSync(resolved).isDirectory()) {
          files.push(...globSync(`${resolved}/**/*.yaml`));
        } else {
          files.push(resolved);
        }
      } catch {
        files.push(resolved);
      }
    }
  }

  if (files.length === 0) {
    console.error("No files specified.");
    process.exit(1);
  }

  for (const file of files) {
    const raw = readFileSync(file, "utf-8");
    const data = parse(raw) as Record<string, unknown>;
    const isbn = data.isbn_13 as string | undefined;

    if (!isbn) {
      console.log(`SKIP (no isbn_13): ${file}`);
      continue;
    }

    console.log(`Fetching metadata for ISBN ${isbn}...`);
    const meta = await fetchByIsbn(isbn);

    if (!meta) {
      console.warn(`  No data found for ISBN ${isbn}`);
      continue;
    }

    let changed = false;

    if (meta.title && !data.title) {
      data.title = meta.title;
      changed = true;
    }
    if (meta.authors && (!data.authors || (data.authors as string[]).length === 0)) {
      data.authors = meta.authors;
      changed = true;
    }
    if (meta.publicationYear && !data.publication_year) {
      data.publication_year = meta.publicationYear;
      changed = true;
    }
    if (meta.language && !data.language) {
      data.language = meta.language;
      changed = true;
    }

    if (changed) {
      const sorted = sortFields(data);
      writeFileSync(file, stringify(sorted, { lineWidth: 100 }), "utf-8");
      console.log(`  Updated: ${file}`);
    } else {
      console.log(`  No changes needed: ${file}`);
    }
  }
}
