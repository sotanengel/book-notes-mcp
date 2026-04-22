#!/usr/bin/env node
/**
 * Verify that every user-facing CLI npm script is documented in README.md.
 *
 * Run manually : node scripts/check-readme.mjs
 * Run in CI   : included in the "test" workflow
 */

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const readme = readFileSync("README.md", "utf-8");

// Scripts that are development tooling, not user-facing CLI commands.
const TOOLING = new Set([
  "build",
  "test",
  "test:watch",
  "typecheck",
  "lint",
  "lint:fix",
  "prepare",
  "check:readme",
]);

const missing = [];

for (const name of Object.keys(pkg.scripts ?? {})) {
  if (TOOLING.has(name)) continue;
  if (!readme.includes(`npm run ${name}`)) {
    missing.push(name);
  }
}

if (missing.length > 0) {
  console.error("README.md is missing documentation for the following npm scripts:\n");
  for (const name of missing) {
    console.error(`  npm run ${name}`);
  }
  console.error("\nAdd each command to the 'CLI コマンド一覧' section in README.md, then re-run.");
  process.exit(1);
}

const count = Object.keys(pkg.scripts ?? {}).length - TOOLING.size;
console.log(`README.md documents all ${count} CLI scripts ✓`);
