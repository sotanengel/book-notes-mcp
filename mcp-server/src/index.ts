#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getDb } from "./db-client.js";
import { ALL_TOOLS, dispatchTool } from "./tools/registry.js";

const server = new Server(
  { name: "book-notes-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const db = getDb();
  return dispatchTool(request.params.name, request.params.arguments ?? {}, db);
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[book-notes-mcp] MCP server started (stdio)\n");
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[book-notes-mcp] Fatal: ${msg}\n`);
  process.exit(1);
});
