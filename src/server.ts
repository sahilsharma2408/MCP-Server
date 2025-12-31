#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'http';
// import * as Sentry from '@sentry/node';

import {
  createNaosCursorRulesToolName,
  createNaosCursorRulesToolDescription,
  createNaosCursorRulesToolSchema,
  createNaosCursorRulesToolCallback,
} from './tools/createNaosCursorRules.js';

import {
  getNaosTokensToolName,
  getNaosTokensToolDescription,
  getNaosTokensToolSchema,
  getNaosTokensToolCallback,
} from './tools/getNaosTokens.js';

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

import {
  getNaosIconsToolName,
  getNaosIconsToolDescription,
  getNaosIconsToolSchema,
  getNaosIconsToolCallback,
} from './tools/getNaosIcons.js';

import { getPackageJSONVersion } from './utils.js';

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
let httpTransport: StreamableHTTPServerTransport | null = null;

async function initializeServer() {
  if (isInitialized) return;
  
  try {
    setupTools();

    // Create streamable HTTP transport for HTTP communication
    httpTransport = new StreamableHTTPServerTransport();

    // Check if running in Vercel or locally
    if (process.env.VERCEL) {
      // For Vercel serverless functions
      await server.connect(httpTransport);
    } else if (process.env.NODE_ENV === 'production') {
      // Connect server to HTTP transport
      await server.connect(httpTransport);
      
      // Handler function for HTTP requests (non-Vercel production)
      const httpHandler = async (req: IncomingMessage, res: ServerResponse) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        // Handle MCP over HTTP (Streamable HTTP transport)
        if (req.url === '/message' || req.method === 'POST') {
          if (!httpTransport) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server transport not initialized' }));
            return;
          }
          try {
            await httpTransport.handleRequest(req, res);
            return;
          } catch (error) {
            console.error('MCP Transport error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'MCP transport error' }));
            return;
          }
        }
        
        // Basic HTTP API endpoints
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            name: 'Naos MCP Server',
            version: getPackageJSONVersion()
          }));
          return;
        }
        
        if (req.url === '/tools') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            tools: [
              { name: hiNaosToolName, description: hiNaosToolDescription },
              { name: createNaosCursorRulesToolName, description: createNaosCursorRulesToolDescription },
              { name: getNaosTokensToolName, description: getNaosTokensToolDescription },
              { name: getNaosComponentDocsToolName, description: getNaosComponentDocsToolDescription },
              { name: getNaosIconsToolName, description: getNaosIconsToolDescription }
            ]
          }));
          return;
        }
        
        if (req.url === '/sse') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
          });
          
          // Send initial connection event
          res.write(`data: ${JSON.stringify({
            type: 'connection',
            message: 'Connected to Naos MCP Server SSE',
            timestamp: new Date().toISOString()
          })}\n\n`);
          
          // Keep connection alive with periodic heartbeat
          const heartbeat = setInterval(() => {
            res.write(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`);
          }, 30000);
          
          // Clean up on client disconnect
          req.on('close', () => {
            clearInterval(heartbeat);
          });
          
          return;
        }
        
        // Default response - show available endpoints including MCP
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Naos MCP Server is running',
          version: getPackageJSONVersion(),
          endpoints: ['/health', '/tools', '/message', '/sse'],
          mcp_endpoint: req.headers.host ? `https://${req.headers.host}/message` : 'http://localhost:3000/message',
          instructions: 'Use POST /message for MCP protocol communication'
        }));
      };
      
      // For other production environments, create HTTP server
      const { createServer } = await import('http');
      const httpServer = createServer(httpHandler);
      const port = process.env.PORT || 3000;
      httpServer.listen(port, () => {
        console.log(`MCP Server HTTP interface running on port ${port}`);
      });
    } else {
      // For local development - use stdio transport for MCP protocol
      const transport = new StdioServerTransport();
      await server.connect(transport);
    }
    
    isInitialized = true;
  } catch (error: unknown) {
    console.error('Naos MCP Error', error);
    process.exit(1);
  }
}

// Initialize the server for non-Vercel environments
if (!process.env.VERCEL) {
  initializeServer().catch(console.error);
}

// Vercel serverless function handler
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await initializeServer();
  
  // Use the shared httpTransport instance
  if (!httpTransport) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server not properly initialized' }));
    return;
  }
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle MCP over HTTP (Streamable HTTP transport)
  if (req.url === '/message' || req.method === 'POST') {
    try {
      await httpTransport.handleRequest(req, res);
      return;
    } catch (error) {
      console.error('MCP Transport error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'MCP transport error' }));
      return;
    }
  }
  
  // Basic HTTP API endpoints
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      name: 'Naos MCP Server',
      version: getPackageJSONVersion()
    }));
    return;
  }
  
  if (req.url === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tools: [
        { name: hiNaosToolName, description: hiNaosToolDescription },
        { name: createNaosCursorRulesToolName, description: createNaosCursorRulesToolDescription },
        { name: getNaosTokensToolName, description: getNaosTokensToolDescription },
        { name: getNaosComponentDocsToolName, description: getNaosComponentDocsToolDescription },
        { name: getNaosIconsToolName, description: getNaosIconsToolDescription }
      ]
    }));
    return;
  }
  
  if (req.url === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to Naos MCP Server SSE',
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Send server info
    res.write(`data: ${JSON.stringify({
      type: 'info',
      name: 'Naos MCP Server',
      version: getPackageJSONVersion(),
      environment: 'vercel',
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    return;
  }
  
  // Default response - show available endpoints including MCP
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Naos MCP Server is running',
    version: getPackageJSONVersion(),
    endpoints: ['/health', '/tools', '/message', '/sse'],
    mcp_endpoint: req.headers.host ? `https://${req.headers.host}/message` : 'http://localhost:3000/message',
    instructions: 'Use POST /message for MCP protocol communication'
  }));
}
