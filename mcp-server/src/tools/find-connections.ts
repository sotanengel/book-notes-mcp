import type Database from "better-sqlite3";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { FindConnectionsInput } from "../schemas/tool-inputs.js";

export const findConnectionsDef: Tool = {
  name: "find_connections",
  description: "Get related books graph for a given book.",
  inputSchema: {
    type: "object",
    required: ["book_id"],
    properties: {
      book_id: { type: "string", description: "Source book id" },
      depth: {
        type: "number",
        enum: [1, 2],
        default: 1,
        description: "Graph traversal depth (1 or 2)",
      },
    },
  },
};

interface BookNode {
  id: string;
  title: string;
  title_ja?: string | null;
  status: string;
}

interface Edge {
  source_id: string;
  target_id: string;
  relation: string;
  note?: string | null;
}

export function handleFindConnections(args: unknown, db: Database.Database): CallToolResult {
  const params = FindConnectionsInput.parse(args);

  const rootBook = db
    .prepare("SELECT id, title, title_ja, status FROM books WHERE id = ?")
    .get(params.book_id) as BookNode | undefined;

  if (!rootBook) {
    throw new McpError(ErrorCode.InvalidParams, `Book not found: ${params.book_id}`);
  }

  const edges: Edge[] = [];
  const nodeIds = new Set<string>([params.book_id]);

  // Depth 1: direct connections
  const directEdges = db
    .prepare(
      "SELECT source_id, target_id, relation, note FROM book_connections WHERE source_id = ?"
    )
    .all(params.book_id) as Edge[];

  for (const e of directEdges) {
    edges.push(e);
    nodeIds.add(e.target_id);
  }

  // Depth 2: one more hop
  if (params.depth === 2) {
    for (const e of directEdges) {
      const secondEdges = db
        .prepare(
          "SELECT source_id, target_id, relation, note FROM book_connections WHERE source_id = ?"
        )
        .all(e.target_id) as Edge[];
      for (const e2 of secondEdges) {
        if (!edges.some((x) => x.source_id === e2.source_id && x.target_id === e2.target_id)) {
          edges.push(e2);
          nodeIds.add(e2.target_id);
        }
      }
    }
  }

  // Fetch node metadata
  const placeholders = Array.from(nodeIds)
    .map(() => "?")
    .join(", ");
  const nodes = db
    .prepare(`SELECT id, title, title_ja, status FROM books WHERE id IN (${placeholders})`)
    .all(...Array.from(nodeIds)) as BookNode[];

  return {
    content: [{ type: "text", text: JSON.stringify({ nodes, edges }, null, 2) }],
  };
}
