import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import {
  createNaosCursorRulesToolName,
  createNaosCursorRulesToolDescription,
  createNaosCursorRulesToolSchema,
  createNaosCursorRulesToolCallback,
} from '../dist/tools/createNaosCursorRules.js';

import {
  getNaosTokensToolName,
  getNaosTokensToolDescription,
  getNaosTokensToolSchema,
  getNaosTokensToolCallback,
} from '../dist/tools/getNaosTokens.js';

import {
  getNaosComponentDocsToolName,
  getNaosComponentDocsToolDescription,
  getNaosComponentDocsToolSchema,
  getNaosComponentDocsToolCallback,
} from '../dist/tools/getNaosComponentDocs.js';

import {
  hiNaosToolName,
  hiNaosToolDescription,
  hiNaosToolSchema,
  hiNaosToolCallback,
} from '../dist/tools/hiNaos.js';

import {
  getNaosIconsToolName,
  getNaosIconsToolDescription,
  getNaosIconsToolSchema,
  getNaosIconsToolCallback,
} from '../dist/tools/getNaosIcons.js';

import { getPackageJSONVersion } from '../dist/utils.js';

// Create the server instance
const server = new McpServer({
  name: 'Naos MCP',
  version: getPackageJSONVersion(),
});

// Initialize server tools
function setupTools() {
  server.tool(
    hiNaosToolName,
    hiNaosToolDescription,
    hiNaosToolSchema,
    hiNaosToolCallback,
  );

  server.tool(
    createNaosCursorRulesToolName,
    createNaosCursorRulesToolDescription,
    createNaosCursorRulesToolSchema,
    createNaosCursorRulesToolCallback,
  );

  server.tool(
    getNaosTokensToolName,
    getNaosTokensToolDescription,
    getNaosTokensToolSchema,
    getNaosTokensToolCallback,
  );

  server.tool(
    getNaosComponentDocsToolName,
    getNaosComponentDocsToolDescription,
    getNaosComponentDocsToolSchema,
    getNaosComponentDocsToolCallback,
  );

  server.tool(
    getNaosIconsToolName,
    getNaosIconsToolDescription,
    getNaosIconsToolSchema,
    getNaosIconsToolCallback,
  );
}

let isInitialized = false;
let httpTransport = null;

async function initializeServer() {
  if (isInitialized) return;
  
  try {
    setupTools();
    
    // Create streamable HTTP transport for HTTP communication
    httpTransport = new StreamableHTTPServerTransport();
    
    // For Vercel serverless functions
    await server.connect(httpTransport);
    
    isInitialized = true;
  } catch (error) {
    console.error('Naos MCP Error', error);
    throw error;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  await initializeServer();
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle MCP over HTTP (Streamable HTTP transport)
  if (req.url === '/message' || req.method === 'POST') {
    try {
      await httpTransport.handleRequest(req, res);
      return;
    } catch (error) {
      console.error('MCP Transport error:', error);
      res.status(500).json({ error: 'MCP transport error' });
      return;
    }
  }
  
  // Basic HTTP API endpoints
  if (req.url === '/health') {
    res.status(200).json({ 
      status: 'healthy', 
      name: 'Naos MCP Server',
      version: getPackageJSONVersion()
    });
    return;
  }
  
  if (req.url === '/tools') {
    res.status(200).json({
      tools: [
        { name: hiNaosToolName, description: hiNaosToolDescription },
        { name: createNaosCursorRulesToolName, description: createNaosCursorRulesToolDescription },
        { name: getNaosTokensToolName, description: getNaosTokensToolDescription },
        { name: getNaosComponentDocsToolName, description: getNaosComponentDocsToolDescription },
        { name: getNaosIconsToolName, description: getNaosIconsToolDescription }
      ]
    });
    return;
  }
  
  // Default response - show available endpoints including MCP
  res.status(200).json({ 
    message: 'Naos MCP Server is running',
    version: getPackageJSONVersion(),
    endpoints: ['/health', '/tools', '/message'],
    mcp_endpoint: req.headers.host ? `https://${req.headers.host}/message` : 'http://localhost:3000/message',
    instructions: 'Use POST /message for MCP protocol communication'
  });
}