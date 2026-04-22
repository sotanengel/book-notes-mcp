import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "yaml";

interface BookData {
  title?: string;
  title_ja?: string;
  authors?: string[];
  publication_year?: number;
  isbn_13?: string;
  status?: string;
}

function buildTemplate(slug: string, data: BookData): string {
  const heading = data.title_ja ?? data.title ?? slug;
  const authors = (data.authors ?? []).join(", ") || "—";
  const year = data.publication_year ? String(data.publication_year) : "—";
  const isbn = data.isbn_13 ?? "—";
  const status = data.status ?? "to-read";

  const rows = [
    `| 著者 | ${authors} |`,
    data.title_ja ? `| 原題 | ${data.title ?? "—"} |` : null,
    `| 出版年 | ${year} |`,
    `| ISBN | ${isbn} |`,
    `| ステータス | ${status} |`,
    "| URL | |",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `# ${heading}`,
    "",
    "| | |",
    "|---|---|",
    rows,
    "",
    "---",
    "",
    "## なぜ読む",
    "",
    "",
    "## 読書メモ",
    "",
    "",
    "## 重要概念",
    "",
    "",
    "## 印象に残った言葉",
    "",
    "",
    "## アクション",
    "",
  ].join("\n");
}

/**
 * Normalize a memo file:
 * - strip trailing whitespace from every line
 * - collapse 3+ consecutive blank lines to 2
 * - ensure the file ends with exactly one newline
 */
export function formatMemoContent(content: string): string {
  return `${content
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

/**
 * Create a memo file for a book slug. Returns the created path, or null if it already exists.
 */
export function createMemo(memosDir: string, slug: string, data: BookData): string | null {
  const dir = resolve(memosDir);
  const memoPath = resolve(dir, `${slug}.md`);
  if (existsSync(memoPath)) return null;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(memoPath, buildTemplate(slug, data), "utf-8");
  return memoPath;
}

function collectYamlFiles(patterns: string[]): string[] {
  const files: string[] = [];

  if (patterns.length === 0) {
    return globSync("books/**/*.yaml").map((f) => resolve(f));
  }

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

  return files;
}

/** Create memos for YAML files that don't have a corresponding memo yet. */
export function runMemoNew(patterns: string[], memosDir: string): void {
  const yamlFiles = collectYamlFiles(patterns);

  if (yamlFiles.length === 0) {
    console.log("No YAML files found.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const file of yamlFiles) {
    const slug = basename(file, ".yaml");
    let data: BookData = {};
    try {
      data = parse(readFileSync(file, "utf-8")) as BookData;
    } catch {
      console.warn(`SKIP: ${file} — parse error`);
      skipped++;
      continue;
    }

    const memoPath = createMemo(memosDir, slug, data);
    if (memoPath) {
      console.log(`Created: ${memoPath}`);
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`\nCreated ${created} memo(s), ${skipped} already existed`);
}

/** Normalize whitespace and line endings in all memo files under a directory. */
export function runMemoFormat(dir: string, opts: { check?: boolean } = {}): void {
  const files = globSync(`${resolve(dir)}/**/*.md`);

  if (files.length === 0) {
    console.log("No memo files found.");
    return;
  }

  let changed = 0;

  for (const file of files) {
    const original = readFileSync(file, "utf-8");
    const formatted = formatMemoContent(original);
    if (original === formatted) continue;

    if (opts.check) {
      console.log(`Would reformat: ${file}`);
    } else {
      writeFileSync(file, formatted, "utf-8");
      console.log(`Formatted: ${file}`);
    }
    changed++;
  }

  const total = files.length;
  if (opts.check && changed > 0) {
    console.error(`\n${changed} file(s) need formatting. Run: npm run memo:format`);
    process.exit(1);
  }

  const suffix = changed > 0 ? `, ${changed} reformatted` : " ✓";
  console.log(`\n${total - changed}/${total} files already formatted${suffix}`);
}
