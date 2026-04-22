import type Database from "better-sqlite3";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { SearchConceptsInput } from "../schemas/tool-inputs.js";

export const searchConceptsDef: Tool = {
  name: "search_concepts",
  description: "Full-text search across key concepts from all books.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "number", default: 20 },
    },
  },
};

export function handleSearchConcepts(args: unknown, db: Database.Database): CallToolResult {
  const params = SearchConceptsInput.parse(args);

  const rows = db
    .prepare(`
      SELECT kc.book_id, kc.name, kc.description, kc.related_to,
             b.title AS book_title, rank
      FROM key_concepts_fts f
      JOIN key_concepts kc ON kc.book_id = f.book_id AND kc.name = f.name
      JOIN books b ON b.id = kc.book_id
      WHERE key_concepts_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
    .all(params.query, params.limit);

  return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
}
