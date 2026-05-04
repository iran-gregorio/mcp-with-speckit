// src/index.ts
// Entrypoint: creates server, connects stdio transport, and starts listening.
// Run with: node dist/index.js  or  tsx src/index.ts

import 'dotenv/config';

// FR-010: Validate TOKEN_SERVICE presence at startup
const token = process.env.TOKEN_SERVICE?.trim();
if (!token) {
  process.stderr.write(
    'ERROR: TOKEN_SERVICE environment variable is required but not set.\n' +
    'Configure it in your MCP client settings (e.g., claude_desktop_config.json).\n'
  );
  process.exit(1);
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ValuerayClient } from './infrastructure/valuerayClient.js';
import { AssetService } from './application/assetService.js';
import { createMcpServer } from './mcp/server.js';

async function main() {
  const client = new ValuerayClient();
  const assetService = new AssetService(client);
  const server = createMcpServer(assetService);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP stdio protocol
  process.stderr.write('Valueray MCP Server started\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
