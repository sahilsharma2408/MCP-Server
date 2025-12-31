// Vercel serverless function entry point
// This file re-exports the main server functionality

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inline utilities needed from utils.js since we can't reliably import from dist in Vercel
const getPackageJSONVersion = () => {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '0.0.0';
  }
};

// Tool imports - these need to be available in the deployment
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

async function initializeServer() {
  if (isInitialized) return;

  try {
    setupTools();
    // Create streamable HTTP transport for HTTP communication
    const httpTransport = new StreamableHTTPServerTransport();
    // Connect server to HTTP transport for Vercel
    await server.connect(httpTransport);
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  try {
    // Initialize server if not already done
    await initializeServer();

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Handle the request with the MCP server
    const transport = server.transport as StreamableHTTPServerTransport;
    
    if (transport && transport.handleRequest) {
      await transport.handleRequest(req, res);
    } else {
      // Fallback response
      res.status(200).json({
        name: 'Naos MCP Server',
        version: getPackageJSONVersion(),
        status: 'running'
      });
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
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
  try {
    await initializeServer();
  } catch (error) {
    console.error('Server initialization failed:', error);
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: error.message 
    });
    return;
  }
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle MCP over HTTP (Streamable HTTP transport)
  if (req.url === '/api' || req.url === '/api/' || req.url === '/api/message' || req.method === 'POST') {
    try {
      await httpTransport.handleRequest(req, res);
      return;
    } catch (error) {
      console.error('MCP Transport error:', error);
      res.status(500).json({ error: 'MCP transport error', details: error.message });
      return;
    }
  }
  
  // Basic HTTP API endpoints
  if (req.url === '/api/health' || req.query.endpoint === 'health') {
    res.status(200).json({ 
      status: 'healthy', 
      name: 'Naos MCP Server',
      version: getPackageJSONVersion()
    });
    return;
  }
  
  if (req.url === '/api/tools' || req.query.endpoint === 'tools') {
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
    endpoints: ['/api/health', '/api/tools', '/api/message'],
    mcp_endpoint: req.headers.host ? `https://${req.headers.host}/api/message` : 'http://localhost:3000/api/message',
    instructions: 'Use POST /api/ for MCP protocol communication',
    env_check: {
      npm_auth_token: process.env.NPM_AUTH_TOKEN ? 'present' : 'missing',
      vercel: process.env.VERCEL || 'not set'
    }
  });
}