import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { applyBusinessRules } from "../src/validator/business-rules.js";
import { validateBookEntry } from "../src/validator/schema-validator.js";
import { createResult } from "../src/validator/types.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

function loadYaml(path: string): unknown {
  return parse(readFileSync(path, "utf-8"));
}

describe("schema validation", () => {
  it("accepts a fully valid book entry", () => {
    const data = loadYaml(join(FIXTURES, "valid-book.yaml"));
    const result = validateBookEntry(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a minimal valid book entry", () => {
    const data = loadYaml(join(FIXTURES, "minimal-book.yaml"));
    const result = validateBookEntry(data);
    expect(result.valid).toBe(true);
  });

  it("rejects a book missing title", () => {
    const data = loadYaml(join(FIXTURES, "invalid-books/missing-title.yaml"));
    const result = validateBookEntry(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("title") || e.message.includes("title"))).toBe(
      true
    );
  });
});

describe("business rules", () => {
  it("errors on id/slug mismatch", () => {
    const result = createResult();
    applyBusinessRules({ id: "book-a-2024", slug: "book-b-2024" }, result);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/slug.*must match.*id/);
  });

  it("detects duplicate highlight ids", () => {
    const result = createResult();
    applyBusinessRules(
      {
        id: "book-a-2024",
        slug: "book-a-2024",
        highlights: [
          { id: "h-001", text: "a" },
          { id: "h-001", text: "b" },
        ],
      },
      result
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate highlight"))).toBe(true);
  });

  it("warns at 401 chars (over warn threshold)", () => {
    const result = createResult();
    applyBusinessRules(
      {
        id: "book-a-2024",
        slug: "book-a-2024",
        highlights: [{ id: "h-001", text: "a".repeat(401) }],
      },
      result
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns at 800 chars (non-strict)", () => {
    const result = createResult();
    applyBusinessRules(
      {
        id: "book-a-2024",
        slug: "book-a-2024",
        highlights: [{ id: "h-001", text: "a".repeat(800) }],
      },
      result,
      { strict: false }
    );
    expect(result.valid).toBe(true);
  });

  it("errors at 801 chars in strict mode", () => {
    const result = createResult();
    applyBusinessRules(
      {
        id: "book-a-2024",
        slug: "book-a-2024",
        highlights: [{ id: "h-001", text: "a".repeat(801) }],
      },
      result,
      { strict: true }
    );
    expect(result.valid).toBe(false);
  });

  it("detects bad ISBN-13 check digit", () => {
    const data = loadYaml(join(FIXTURES, "invalid-books/bad-isbn.yaml")) as {
      id: string;
      slug: string;
      isbn_13: string;
    };
    const result = createResult();
    applyBusinessRules(data, result);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("check digit"))).toBe(true);
  });

  it("detects self-referential connection", () => {
    const result = createResult();
    applyBusinessRules(
      {
        id: "book-a-2024",
        slug: "book-a-2024",
        connections: [{ book_id: "book-a-2024" }],
      },
      result
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cannot reference itself"))).toBe(true);
  });
});
