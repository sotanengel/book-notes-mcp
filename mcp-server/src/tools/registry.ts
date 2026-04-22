import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type Database from "better-sqlite3";
import { ZodError } from "zod";
import { findConnectionsDef, handleFindConnections } from "./find-connections.js";
import {
  getActionableInsightsDef,
  handleGetActionableInsights,
} from "./get-actionable-insights.js";
import { getBookDef, handleGetBook } from "./get-book.js";
import { handleListBooks, listBooksDef } from "./list-books.js";
import { handleSearchBooks, searchBooksDef } from "./search-books.js";
import { handleSearchConcepts, searchConceptsDef } from "./search-concepts.js";
import { handleSearchHighlights, searchHighlightsDef } from "./search-highlights.js";

export const ALL_TOOLS: Tool[] = [
  listBooksDef,
  getBookDef,
  searchBooksDef,
  searchHighlightsDef,
  searchConceptsDef,
  findConnectionsDef,
  getActionableInsightsDef,
];

type Handler = (args: unknown, db: Database.Database) => CallToolResult;

const HANDLERS: Record<string, Handler> = {
  list_books: handleListBooks,
  get_book: handleGetBook,
  search_books: handleSearchBooks,
  search_highlights: handleSearchHighlights,
  search_concepts: handleSearchConcepts,
  find_connections: handleFindConnections,
  get_actionable_insights: handleGetActionableInsights,
};

export function dispatchTool(name: string, args: unknown, db: Database.Database): CallToolResult {
  const handler = HANDLERS[name];
  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    return handler(args, db);
  } catch (err) {
    if (err instanceof McpError) throw err;
    if (err instanceof ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid input: ${err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[book-notes-mcp] Tool error (${name}): ${msg}\n`);
    throw new McpError(ErrorCode.InternalError, "Database query failed");
  }
}
