import { readFileSync, statSync } from "node:fs";
import { globSync } from "node:fs";
import { resolve, sep } from "node:path";
import { parse } from "yaml";
import { applyBusinessRules } from "../../validator/business-rules.js";
import { validateBookEntry, validateTopicNote } from "../../validator/schema-validator.js";

export interface ValidateOptions {
  strict?: boolean;
  json?: boolean;
}

/** Core validation logic. Returns true if all files are valid. */
export function validateFiles(patterns: string[], opts: ValidateOptions): boolean {
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
    files.push(...globSync("books/**/*.yaml").map((f) => resolve(f)));
  }

  let hasError = false;
  const results: Array<{ file: string; errors: string[]; warnings: string[] }> = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = readFileSync(file, "utf-8");
    } catch {
      console.error(`ERROR: Cannot read file: ${file}`);
      hasError = true;
      continue;
    }

    let data: unknown;
    try {
      data = parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (opts.json) {
        results.push({ file, errors: [`YAML parse error: ${msg}`], warnings: [] });
      } else {
        console.error(`  ERROR: YAML parse error in ${file}: ${msg}`);
      }
      hasError = true;
      continue;
    }

    const isTopic = file.includes(`${sep}topics${sep}`) || file.includes("/topics/");
    const schemaResult = isTopic ? validateTopicNote(data) : validateBookEntry(data);
    if (!isTopic) {
      applyBusinessRules(
        data as Parameters<typeof applyBusinessRules>[0],
        schemaResult,
        opts.strict ? { strict: true } : {}
      );
    }

    const fileErrors = schemaResult.errors.map((e) => `${e.path}: ${e.message}`);
    const fileWarnings = schemaResult.warnings.map((w) => `${w.path}: ${w.message}`);

    if (opts.json) {
      results.push({ file, errors: fileErrors, warnings: fileWarnings });
    } else {
      if (!schemaResult.valid || fileWarnings.length > 0) {
        console.log(`\n${file}`);
        for (const err of fileErrors) {
          console.error(`  ERROR: ${err}`);
        }
        for (const warn of fileWarnings) {
          console.warn(`  WARN:  ${warn}`);
        }
        if (schemaResult.valid && fileWarnings.length > 0) {
          console.log("  OK (with warnings)");
        }
      }
    }

    if (!schemaResult.valid) hasError = true;
  }

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const total = files.length;
    const failed = results.filter((r) => r.errors.length > 0).length;
    const suffix = hasError ? ` — ${failed} error(s)` : " ✓";
    console.log(`\n${total - failed}/${total} files valid${suffix}`);
  }

  return !hasError;
}

export function runValidate(patterns: string[], opts: ValidateOptions): void {
  if (!validateFiles(patterns, opts)) process.exit(1);
}
