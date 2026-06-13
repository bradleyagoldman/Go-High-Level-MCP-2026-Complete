/**
 * GoHighLevel MCP Server
 * Streamable HTTP transport with optional legacy SSE support.
 */

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { EnhancedGHLClient } from './enhanced-ghl-client.js';
import { ToolRegistry } from './tool-registry.js';
import { GHLConfig } from './types/ghl-types.js';
import { registerExecuteRoutes } from './execute-route.js';

dotenv.config();

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;
  process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(data || {}) }) + '\n');
}

function readConfig(): GHLConfig {
  const config: GHLConfig = {
    accessToken: process.env.GHL_API_KEY || '',
    baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
    version: process.env.GHL_API_VERSION || '2023-02-21',
    locationId: process.env.GHL_LOCATION_ID || '',
  };
  if (!config.accessToken) throw new Error('GHL_API_KEY is required');
  if (!config.locationId) throw new Error('GHL_LOCATION_ID is required');
  return config;
}

function createMcpServer(client: EnhancedGHLClient): McpServer {
  const server = new McpServer(
    { name: 'ghl-mcp-server', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );
  new ToolRegistry(client).registerAll(server);
  return server;
}

async function main() {
  const port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000', 10);
  const config = readConfig();
  const ghlClient = new EnhancedGHLClient(config);
  const registry = new ToolRegistry(ghlClient);
  const toolCount = registry.getToolCount();
  const startTime = Date.now();

  log('info', 'Initializing GHL MCP server', {
    port,
    baseUrl: config.baseUrl,
    locationId: config.locationId,
    tools: toolCount,
  });

  // Non-fatal connection test — server starts regardless
  try {
    await ghlClient.testConnection();
    log('info', 'GHL API connection successful');
  } catch (err: any) {
    log('warn', 'GHL API connection test failed — continuing anyway', { error: err.message });
  }

  const app = express();

  // Open CORS — allow all origins (server is auth-protected via GHL credentials)
  app.use(cors({ origin: true, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', 'x-ghl-access-token', 'x-ghl-location-id'], credentials: true }));
  app.use(express.json());
  app.use((req, _res, next) => { log('debug', `${req.method} ${req.path}`); next(); });

  app.all('/mcp', async (req, res) => {
    try {
      const reqAccessToken = req.headers['x-ghl-access-token'] as string | undefined;
      const reqLocationId = req.headers['x-ghl-location-id'] as string | undefined;
      const client = reqAccessToken && reqLocationId
        ? new EnhancedGHLClient({ ...config, accessToken: reqAccessToken, locationId: reqLocationId })
        : ghlClient;
      const requestServer = createMcpServer(client);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await requestServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => { requestServer.close().catch(() => {}); });
    } catch (err: any) {
      log('error', 'Streamable HTTP error', { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  const handleSSE = async (req: express.Request, res: express.Response) => {
    try {
      const sseServer = createMcpServer(ghlClient);
      const transport = new SSEServerTransport('/sse', res);
      await sseServer.connect(transport);
      req.on('close', () => { sseServer.close().catch(() => {}); });
    } catch (err: any) {
      log('error', 'SSE error', { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Failed to establish SSE connection' });
      else res.end();
    }
  };

  app.get('/sse', handleSSE);
  app.post('/sse', handleSSE);

  app.get('/health', (_req, res) => {
    const mem = process.memoryUsage();
    res.json({ status: 'healthy', server: 'ghl-mcp-server', version: '2.0.0', uptime: Math.floor((Date.now() - startTime) / 1000), tools: toolCount, memory: { rss: `${Math.round(mem.rss / 1024 / 1024)}MB` } });
  });

  app.get('/', (_req, res) => {
    res.json({ name: 'GoHighLevel MCP Server', version: '2.0.0', status: 'running', tools: toolCount, endpoints: { mcp: '/mcp', sse: '/sse', health: '/health' } });
  });

  registerExecuteRoutes(app, registry, config);

  app.post('/tools/call', async (req, res) => {
    const { name, arguments: args } = req.body;
    if (!name) { res.status(400).json({ error: 'Missing tool name' }); return; }
    try {
      const result = await registry.callTool(name, args || {});
      if (result === undefined) { res.status(404).json({ error: `Unknown tool: ${name}` }); return; }
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: `Tool execution failed: ${err.message}` });
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`GoHighLevel MCP Server v2.0 running on port ${port}`);
    console.log(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.log(`SSE endpoint: http://0.0.0.0:${port}/sse`);
    console.log(`Tools loaded: ${toolCount}`);
  });
}

process.on('SIGINT', () => { log('info', 'Shutting down (SIGINT)'); process.exit(0); });
process.on('SIGTERM', () => { log('info', 'Shutting down (SIGTERM)'); process.exit(0); });

main().catch((err) => {
  log('error', 'Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});
