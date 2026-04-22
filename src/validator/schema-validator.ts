import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import addFormats from "ajv-formats";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidationResult } from "./types.js";
import { addError, createResult } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dirname, "../../schema");

let ajv: InstanceType<typeof Ajv2020> | null = null;

function getAjv(): InstanceType<typeof Ajv2020> {
  if (ajv) return ajv;

  ajv = new Ajv2020({ allErrors: true, strict: true });
  // ajv-formats is a CJS module; cast needed for ESM interop
  (addFormats as unknown as (a: InstanceType<typeof Ajv2020>) => void)(ajv);

  const bookSchema = JSON.parse(readFileSync(join(SCHEMA_DIR, "book-entry.schema.json"), "utf-8"));
  const topicSchema = JSON.parse(readFileSync(join(SCHEMA_DIR, "topic-note.schema.json"), "utf-8"));

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
