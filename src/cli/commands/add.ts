import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { createMemo } from "./memo.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function buildSlug(title: string, authorFamily: string): string {
  const titleSlug = slugify(title).split("-").slice(0, 4).join("-");
  const authorSlug = slugify(authorFamily);
  const year = new Date().getFullYear();
  return `${titleSlug}-${authorSlug}-${year}`;
}

function uniqueSlug(slug: string, booksDir: string): string {
  let candidate = slug;
  let suffix = 2;
  while (existsSync(resolve(booksDir, `${candidate}.yaml`))) {
    candidate = `${slug}-${suffix}`;
    suffix++;
  }
  return candidate;
}

export async function runAdd(booksDir: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\nAdd new book entry\n");

  try {
    const title = (await prompt(rl, "Title: ")).trim();
    if (!title) {
      console.error("Title is required.");
      process.exit(1);
    }

    const authorsRaw = (await prompt(rl, "Author(s): ")).trim();
    if (!authorsRaw) {
      console.error("At least one author is required.");
      process.exit(1);
    }
    const authors = authorsRaw
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const authorFamily = slugify(authors[0]?.split(" ").pop() ?? "unknown");
    const slug = uniqueSlug(buildSlug(title, authorFamily), booksDir);
    const outPath = resolve(booksDir, `${slug}.yaml`);

    const lines = [
      `schema_version: "1.0"`,
      `id: ${slug}`,
      `slug: ${slug}`,
      `title: ${JSON.stringify(title)}`,
      "authors:",
      ...authors.map((a) => `  - ${JSON.stringify(a)}`),
      "status: to-read",
      "tags: []",
      `summary: ""`,
      "key_concepts: []",
      "highlights: []",
      "action_items: []",
      "connections: []",
      "open_questions: []",
      "ai_generated:",
      "  summary: false",
      "  key_concepts: false",
      "  tags: false",
    ];

    writeFileSync(outPath, `${lines.join("\n")}\n`, "utf-8");
    console.log(`\n✓ Created: ${outPath}`);

    const memoPath = createMemo("memos", slug, { title });
    if (memoPath) console.log(`✓ Memo:    ${memoPath}`);

    console.log("\nNext steps:");
    console.log(`  npm run sync -- ${outPath}   # enrich → validate → index`);
  } finally {
    rl.close();
  }
}
