import type Database from "better-sqlite3";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { parse } from "yaml";
import { GetBookInput } from "../schemas/tool-inputs.js";

export const getBookDef: Tool = {
  name: "get_book",
  description: "Get full details of a single book by its id (slug).",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
        description: "Book id (slug), e.g. atomic-habits-clear-2018",
      },
    },
  },
};

export function handleGetBook(args: unknown, db: Database.Database): CallToolResult {
  const params = GetBookInput.parse(args);
  const row = db
    .prepare("SELECT raw_yaml FROM books WHERE id = ?")
    .get(params.id) as { raw_yaml: string } | undefined;

  if (!row) {
    throw new McpError(ErrorCode.InvalidParams, `Book not found: ${params.id}`);
  }

  const data = parse(row.raw_yaml) as unknown;
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
