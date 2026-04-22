import type Database from "better-sqlite3";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { SearchHighlightsInput } from "../schemas/tool-inputs.js";

export const searchHighlightsDef: Tool = {
  name: "search_highlights",
  description: "Full-text search across all highlights and notes.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", description: "Search query" },
      book_id: { type: "string", description: "Limit to a specific book" },
      limit: { type: "number", default: 20 },
    },
  },
};

export function handleSearchHighlights(
  args: unknown,
  db: Database.Database
): CallToolResult {
  const params = SearchHighlightsInput.parse(args);

  const bookFilter = params.book_id ? "AND h.book_id = ?" : "";
  const bindings: unknown[] = [params.query];
  if (params.book_id) bindings.push(params.book_id);
  bindings.push(params.limit);

  const rows = db
    .prepare(`
      SELECT h.book_id, h.highlight_id, h.page, h.text, h.note, h.tags,
             b.title AS book_title, rank
      FROM highlights_fts f
      JOIN highlights h ON h.book_id = f.book_id AND h.highlight_id = f.highlight_id
      JOIN books b ON b.id = h.book_id
      WHERE highlights_fts MATCH ? ${bookFilter}
      ORDER BY rank
      LIMIT ?
    `)
    .all(...bindings);

  return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
}
