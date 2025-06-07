#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import {
  createNaosCursorRulesToolName,
  createNaosCursorRulesToolDescription,
  createNaosCursorRulesToolSchema,
  createNaosCursorRulesToolCallback,
} from './tools/createNaosCursorRules.js';
import {
  getNaosComponentDocsToolName,
  getNaosComponentDocsToolDescription,
  getNaosComponentDocsToolSchema,
  getNaosComponentDocsToolCallback,
} from './tools/getNaosComponentDocs.js';
import {
  hiNaosToolName,
  hiNaosToolDescription,
  hiNaosToolSchema,
  hiNaosToolCallback,
} from './tools/hiNaos.js';
import { getPackageJSONVersion } from './utils.js';

try {
  const server = new McpServer({
    name: 'Naos MCP',
    version: getPackageJSONVersion(),
  });

  server.tool(
    hiNaosToolName,
    hiNaosToolDescription,
    hiNaosToolSchema,
    hiNaosToolCallback
  );

  server.tool(
    createNaosCursorRulesToolName,
    createNaosCursorRulesToolDescription,
    createNaosCursorRulesToolSchema,
    createNaosCursorRulesToolCallback
  );

  server.tool(
    getNaosComponentDocsToolName,
    getNaosComponentDocsToolDescription,
    getNaosComponentDocsToolSchema,
    getNaosComponentDocsToolCallback
  );

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();

  // Use Promise handling for async operations
  await server.connect(transport);
} catch (error: unknown) {
  console.error('Naos MCP Error', error);
  process.exit(1);
}
