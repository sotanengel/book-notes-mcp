import { checkRefs } from "./check-refs.js";
import { runEnrich } from "./enrich.js";
import { runFormat } from "./format.js";
import { runIndexBuild } from "./index-cmd.js";
import { validateFiles } from "./validate.js";

export interface SyncOptions {
  books?: string;
  topics?: string;
  db?: string;
  strict?: boolean;
  skipEnrich?: boolean;
}

function step(current: number, total: number, label: string): void {
  console.log(`\n[${current}/${total}] ${label}...`);
}

function fail(current: number, total: number, label: string, hint?: string): never {
  console.error(
    `\n✗  Step ${current}/${total} (${label}) failed — fix the errors above and run again.`
  );
  if (hint) console.error(`   Hint: ${hint}`);
  process.exit(1);
}

export async function runSync(files: string[], opts: SyncOptions): Promise<void> {
  const booksDir = opts.books ?? "books";
  const topicsDir = opts.topics ?? "topics";
  const dbPath = opts.db ?? "books.db";

  // Determine which files go through validate / format / enrich.
  // When no files are given, process both books/ and topics/.
  const targets = files.length > 0 ? files : [booksDir, topicsDir];
  // Enrich only applies to books (needs isbn_13), not topics.
  const enrichTargets = files.length > 0 ? files : [booksDir];

  const steps = [
    "validate",
    "format",
    ...(opts.skipEnrich ? [] : ["enrich"]),
    "check-refs",
    "index",
  ];
  const total = steps.length;
  let n = 0;

  console.log("=== book-notes sync ===");

  // ── 1. Validate ──────────────────────────────────────────────────────────
  n++;
  step(n, total, "Validating");
  const valid = validateFiles(targets, opts.strict ? { strict: true } : {});
  if (!valid) {
    fail(n, total, "validate", `book-notes validate ${targets.join(" ")}`);
  }

  // ── 2. Format ────────────────────────────────────────────────────────────
  n++;
  step(n, total, "Formatting");
  try {
    runFormat(targets, {});
    console.log("  ✓ Done");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    fail(n, total, "format");
  }

  // ── 3. Enrich (optional) ─────────────────────────────────────────────────
  if (!opts.skipEnrich) {
    n++;
    step(n, total, "Enriching metadata");
    try {
      await runEnrich(enrichTargets);
      console.log("  ✓ Done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      fail(n, total, "enrich", "use --skip-enrich to skip this step");
    }
  }

  // ── 4. Check references ───────────────────────────────────────────────────
  n++;
  step(n, total, "Checking references");
  const refsOk = checkRefs(booksDir);
  if (!refsOk) {
    fail(n, total, "check-refs", `book-notes check-refs --books ${booksDir}`);
  }

  // ── 5. Build index ────────────────────────────────────────────────────────
  n++;
  step(n, total, "Building index");
  try {
    runIndexBuild(dbPath, booksDir, topicsDir);
    console.log("  ✓ Done");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    fail(n, total, "index", `book-notes index build --db ${dbPath}`);
  }

  console.log("\n✓  All done");
}
