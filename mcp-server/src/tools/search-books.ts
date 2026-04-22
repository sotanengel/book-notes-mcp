import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type Database from "better-sqlite3";
import { SearchBooksInput } from "../schemas/tool-inputs.js";

export const searchBooksDef: Tool = {
  name: "search_books",
  description: "Full-text search across book titles, authors, summaries, and tags.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "number", default: 20 },
      offset: { type: "number", default: 0 },
    },
  },
};

export function handleSearchBooks(args: unknown, db: Database.Database): CallToolResult {
  const params = SearchBooksInput.parse(args);

  const rows = db
    .prepare(`
      SELECT b.id, b.title, b.title_ja, b.authors, b.status, b.rating, b.tags,
             b.summary, rank
      FROM books_fts f
      JOIN books b ON b.id = f.id
      WHERE books_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `)
    .all(params.query, params.limit, params.offset);

  return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
}
