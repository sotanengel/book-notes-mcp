import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ValidationResult } from "./types.js";
import { addError, createResult } from "./types.js";

const SCHEMA_DIR = join(import.meta.dirname ?? __dirname, "../../schema");

let ajv: Ajv | null = null;

function getAjv(): Ajv {
  if (ajv) return ajv;

  ajv = new Ajv({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv as Parameters<typeof addFormats>[0]);

  const bookSchema = JSON.parse(
    readFileSync(join(SCHEMA_DIR, "book-entry.schema.json"), "utf-8")
  );
  const topicSchema = JSON.parse(
    readFileSync(join(SCHEMA_DIR, "topic-note.schema.json"), "utf-8")
  );

  ajv.addSchema(bookSchema, "book-entry");
  ajv.addSchema(topicSchema, "topic-note");

  return ajv;
}

export function validateBookEntry(data: unknown): ValidationResult {
  const result = createResult();
  const validator = getAjv();
  const valid = validator.validate("book-entry", data);

  if (!valid && validator.errors) {
    for (const err of validator.errors) {
      const path = err.instancePath || "/";
      addError(result, path, `${err.message ?? "validation error"} (${err.keyword})`);
    }
  }

  return result;
}

export function validateTopicNote(data: unknown): ValidationResult {
  const result = createResult();
  const validator = getAjv();
  const valid = validator.validate("topic-note", data);

  if (!valid && validator.errors) {
    for (const err of validator.errors) {
      const path = err.instancePath || "/";
      addError(result, path, `${err.message ?? "validation error"} (${err.keyword})`);
    }
  }

  return result;
}
