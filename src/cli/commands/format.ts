import { readFileSync, statSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { resolve } from "node:path";
import { formatYaml } from "../../formatter/yaml-formatter.js";

export interface FormatOptions {
  check?: boolean;
}

export function runFormat(patterns: string[], opts: FormatOptions): void {
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

  let needsFormat = false;

  for (const file of files) {
    const original = readFileSync(file, "utf-8");
    const formatted = formatYaml(original);

    if (original === formatted) {
      continue;
    }

    if (opts.check) {
      console.log(`Would reformat: ${file}`);
      needsFormat = true;
    } else {
      writeFileSync(file, formatted, "utf-8");
      console.log(`Formatted: ${file}`);
    }
  }

  if (opts.check && needsFormat) {
    console.error("\nSome files need formatting. Run: npm run format");
    process.exit(1);
  }
}
