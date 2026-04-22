import type { ValidationResult } from "./types.js";
import { addError, addWarning } from "./types.js";

const HIGHLIGHT_WARN_CHARS = 400;
const HIGHLIGHT_ERROR_CHARS = 800;

interface Highlight {
  id?: string;
  text?: string;
}

interface ActionItem {
  id?: string;
}

interface BookEntry {
  id?: string;
  slug?: string;
  isbn_13?: string;
  highlights?: Highlight[];
  action_items?: ActionItem[];
  status?: string;
  read_sessions?: unknown[];
  connections?: Array<{ book_id?: string }>;
}

export function applyBusinessRules(
  data: BookEntry,
  result: ValidationResult,
  opts: { strict?: boolean } = {}
): void {
  checkIdSlugMatch(data, result);
  checkIsbn13Checkdigit(data, result);
  checkHighlightIds(data, result, opts.strict ?? false);
  checkActionItemIds(data, result);
  checkCompletedSessionRequired(data, result);
  checkSelfReference(data, result);
}

function checkIdSlugMatch(data: BookEntry, result: ValidationResult): void {
  if (data.id !== undefined && data.slug !== undefined && data.id !== data.slug) {
    addError(result, "/slug", `slug "${data.slug}" must match id "${data.id}"`);
  }
}

function checkIsbn13Checkdigit(data: BookEntry, result: ValidationResult): void {
  const isbn = data.isbn_13;
  if (!isbn) return;

  const digits = isbn.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (digits[i] ?? 0) * (i % 2 === 0 ? 1 : 3);
  }
  const expected = (10 - (sum % 10)) % 10;
  if (expected !== digits[12]) {
    addError(result, "/isbn_13", `ISBN-13 check digit is invalid (expected ${expected})`);
  }
}

function checkHighlightIds(data: BookEntry, result: ValidationResult, strict: boolean): void {
  const highlights = data.highlights;
  if (!highlights) return;

  const seen = new Set<string>();
  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    if (!h) continue;

    const id = h.id;
    if (id !== undefined) {
      if (seen.has(id)) {
        addError(result, `/highlights/${i}/id`, `Duplicate highlight id "${id}"`);
      }
      seen.add(id);
    }

    const text = h.text;
    if (text !== undefined) {
      const len = text.length;
      if (len > HIGHLIGHT_ERROR_CHARS) {
        if (strict) {
          addError(
            result,
            `/highlights/${i}/text`,
            `Highlight text is ${len} chars (limit: ${HIGHLIGHT_ERROR_CHARS} in --strict mode)`
          );
        } else {
          addWarning(
            result,
            `/highlights/${i}/text`,
            `Highlight text is ${len} chars (>${HIGHLIGHT_ERROR_CHARS} may violate copyright)`
          );
        }
      } else if (len > HIGHLIGHT_WARN_CHARS) {
        addWarning(
          result,
          `/highlights/${i}/text`,
          `Highlight text is ${len} chars (>${HIGHLIGHT_WARN_CHARS} — review for copyright)`
        );
      }
    }
  }
}

function checkActionItemIds(data: BookEntry, result: ValidationResult): void {
  const items = data.action_items;
  if (!items) return;

  const seen = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const id = item.id;
    if (id !== undefined) {
      if (seen.has(id)) {
        addError(result, `/action_items/${i}/id`, `Duplicate action_item id "${id}"`);
      }
      seen.add(id);
    }
  }
}

function checkCompletedSessionRequired(data: BookEntry, result: ValidationResult): void {
  if (data.status === "completed" && (!data.read_sessions || data.read_sessions.length === 0)) {
    addWarning(result, "/read_sessions", 'status is "completed" but no read_sessions found');
  }
}

function checkSelfReference(data: BookEntry, result: ValidationResult): void {
  const connections = data.connections;
  if (!connections || !data.id) return;

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    if (conn?.book_id === data.id) {
      addError(result, `/connections/${i}/book_id`, "A book cannot reference itself");
    }
  }
}
