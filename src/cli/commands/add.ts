import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const GENRES = [
  "business",
  "technology",
  "psychology",
  "management",
  "marketing",
  "economics",
  "philosophy",
  "biography",
  "other",
];
const LANGUAGES = ["ja", "en", "zh", "de", "fr", "es", "ko", "other"];
const STATUSES = ["to-read", "reading", "completed", "abandoned", "reference"];

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

function buildSlug(title: string, authorFamily: string, year: string): string {
  const titleSlug = slugify(title).split("-").slice(0, 4).join("-");
  const authorSlug = slugify(authorFamily);
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

  console.log("\n📖 Add new book entry\n");

  try {
    const title = (await prompt(rl, "Title (required): ")).trim();
    if (!title) {
      console.error("Title is required.");
      process.exit(1);
    }

    const authorsRaw = (await prompt(rl, "Authors (comma-separated): ")).trim();
    if (!authorsRaw) {
      console.error("At least one author is required.");
      process.exit(1);
    }
    const authors = authorsRaw
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const authorFamily = slugify(authors[0]?.split(" ").pop() ?? "unknown");
    const yearRaw = (await prompt(rl, "Publication year (e.g. 2024): ")).trim();
    const year = /^\d{4}$/.test(yearRaw) ? yearRaw : new Date().getFullYear().toString();

    const titleJa = (await prompt(rl, "Japanese title (optional): ")).trim();
    const isbn = (await prompt(rl, "ISBN-13 (optional): ")).trim().replace(/[-\s]/g, "");

    console.log(`\nLanguage: ${LANGUAGES.join(", ")}`);
    const language = (await prompt(rl, "Language [en]: ")).trim() || "en";

    console.log(`Genres: ${GENRES.join(", ")}`);
    const genreRaw = (await prompt(rl, "Genre(s) (comma-separated, optional): ")).trim();
    const genre = genreRaw
      ? genreRaw
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : [];

    console.log(`Status: ${STATUSES.join(", ")}`);
    const status = (await prompt(rl, "Status [to-read]: ")).trim() || "to-read";

    const slug = uniqueSlug(buildSlug(title, authorFamily, year), booksDir);
    const outPath = resolve(booksDir, `${slug}.yaml`);

    const lines: string[] = [
      `schema_version: "1.0"`,
      `id: ${slug}`,
      `slug: ${slug}`,
      `title: ${JSON.stringify(title)}`,
    ];
    if (titleJa) lines.push(`title_ja: ${JSON.stringify(titleJa)}`);
    lines.push("authors:");
    for (const a of authors) lines.push(`  - ${JSON.stringify(a)}`);
    if (isbn && /^\d{13}$/.test(isbn)) lines.push(`isbn_13: "${isbn}"`);
    if (/^\d{4}$/.test(year)) lines.push(`publication_year: ${year}`);
    if (LANGUAGES.includes(language)) lines.push(`language: ${language}`);
    if (genre.length > 0) {
      lines.push("genre:");
      for (const g of genre) lines.push(`  - ${g}`);
    }
    lines.push(`status: ${status}`);
    lines.push("tags: []");
    lines.push(`summary: ""`);
    lines.push("key_concepts: []");
    lines.push("highlights: []");
    lines.push("action_items: []");
    lines.push("connections: []");
    lines.push("open_questions: []");
    lines.push("ai_generated:");
    lines.push("  summary: false");
    lines.push("  key_concepts: false");
    lines.push("  tags: false");

    writeFileSync(outPath, `${lines.join("\n")}\n`, "utf-8");
    console.log(`\n✓ Created: ${outPath}`);
    console.log("\nNext steps:");
    console.log(`  npm run validate -- ${outPath}`);
    console.log(`  npm run enrich -- ${outPath}   # fetch ISBN/metadata`);
  } finally {
    rl.close();
  }
}
