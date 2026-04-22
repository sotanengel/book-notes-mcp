#!/usr/bin/env node
import { Command } from "commander";
import { runAdd } from "./commands/add.js";
import { runCheckRefs } from "./commands/check-refs.js";
import { runEnrich } from "./commands/enrich.js";
import { runFormat } from "./commands/format.js";
import { runIndexBuild, runIndexStatus } from "./commands/index-cmd.js";
import { runValidate } from "./commands/validate.js";

const program = new Command();

program.name("book-notes").description("CLI for managing book note YAML entries").version("0.1.0");

program
  .command("validate [files...]")
  .description("Validate YAML files against schema and business rules")
  .option("--strict", "Treat warnings as errors (including long highlights)")
  .option("--json", "Output results as JSON")
  .action((files: string[], opts: { strict?: boolean; json?: boolean }) => {
    runValidate(files, opts);
  });

program
  .command("format [files...]")
  .description("Normalize field order and YAML style")
  .option("--check", "Exit with error if any file would be reformatted")
  .action((files: string[], opts: { check?: boolean }) => {
    runFormat(files, opts);
  });

program
  .command("add")
  .description("Interactively scaffold a new book entry")
  .option("--books <dir>", "Path to books directory", "books")
  .action((opts: { books: string }) => {
    runAdd(opts.books).catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    });
  });

program
  .command("enrich [files...]")
  .description("Fetch missing metadata from OpenBD / Google Books (no auth required)")
  .action((files: string[]) => {
    runEnrich(files).catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    });
  });

const indexCmd = program.command("index").description("Manage the local SQLite index");

indexCmd
  .command("build")
  .description("Rebuild the SQLite index from books/*.yaml and topics/*.yaml")
  .option("--db <path>", "Path to SQLite database", "books.db")
  .option("--books <dir>", "Path to books directory", "books")
  .option("--topics <dir>", "Path to topics directory", "topics")
  .action((opts: { db: string; books: string; topics: string }) => {
    runIndexBuild(opts.db, opts.books, opts.topics);
  });

indexCmd
  .command("status")
  .description("Show index statistics")
  .option("--db <path>", "Path to SQLite database", "books.db")
  .action((opts: { db: string }) => {
    runIndexStatus(opts.db);
  });

program
  .command("check-refs")
  .description("Verify all connections reference existing books")
  .option("--books <dir>", "Path to books directory", "books")
  .action((opts: { books: string }) => {
    runCheckRefs(opts.books);
  });

program.parse();
