import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type Database from "better-sqlite3";
import { GetActionableInsightsInput } from "../schemas/tool-inputs.js";

export const getActionableInsightsDef: Tool = {
  name: "get_actionable_insights",
  description: "Retrieve action items across all books with optional filters.",
  inputSchema: {
    type: "object",
    properties: {
      book_id: { type: "string", description: "Limit to a specific book" },
      priority: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Filter by priority",
      },
      status: {
        type: "string",
        enum: ["pending", "in-progress", "done", "skipped"],
        description: "Filter by status (default: pending)",
      },
      limit: { type: "number", default: 20 },
    },
  },
};

export function handleGetActionableInsights(args: unknown, db: Database.Database): CallToolResult {
  const params = GetActionableInsightsInput.parse(args);

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.book_id) {
    conditions.push("a.book_id = ?");
    bindings.push(params.book_id);
  }
  if (params.priority) {
    conditions.push("a.priority = ?");
    bindings.push(params.priority);
  }
  const statusFilter = params.status ?? "pending";
  conditions.push("a.status = ?");
  bindings.push(statusFilter);

  bindings.push(params.limit);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`
      SELECT a.book_id, a.action_id, a.action, a.priority, a.status, a.deadline,
             b.title AS book_title
      FROM action_items a
      JOIN books b ON b.id = a.book_id
      ${where}
      ORDER BY CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               a.deadline ASC NULLS LAST
      LIMIT ?
    `)
    .all(...bindings);

  return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
}
