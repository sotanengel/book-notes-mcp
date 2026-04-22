import type Database from "better-sqlite3";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { ListBooksInput } from "../schemas/tool-inputs.js";

export const listBooksDef: Tool = {
  name: "list_books",
  description: "List books with optional filters. Returns title, authors, status, rating, tags.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["to-read", "reading", "completed", "abandoned", "reference"],
        description: "Filter by reading status",
      },
      genre: { type: "string", description: "Filter by genre keyword" },
      language: {
        type: "string",
        enum: ["ja", "en", "zh", "de", "fr", "es", "ko", "other"],
      },
      tag: { type: "string", description: "Filter by tag" },
      limit: { type: "number", default: 20, description: "Max results (1-100)" },
      offset: { type: "number", default: 0 },
    },
  },
};

export function handleListBooks(args: unknown, db: Database.Database): CallToolResult {
  const params = ListBooksInput.parse(args);

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.status) {
    conditions.push("status = ?");
    bindings.push(params.status);
  }
  if (params.language) {
    conditions.push("language = ?");
    bindings.push(params.language);
  }
  if (params.genre) {
    conditions.push("genre LIKE ?");
    bindings.push(`%${params.genre}%`);
  }
  if (params.tag) {
    conditions.push("tags LIKE ?");
    bindings.push(`%${params.tag}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT id, title, title_ja, authors, status, rating, tags, pub_year, language
    FROM books ${where}
    ORDER BY pub_year DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all([...bindings, params.limit, params.offset]);
  return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
}
