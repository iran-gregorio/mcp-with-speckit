// src/mcp/server.ts
// MCP Server factory — wires all tools and prompts.
// Accepts AssetService as a parameter to allow dependency injection in tests.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AssetService } from '../application/assetService.js';
import { registerGetAssetData } from './tools/getAssetData.js';
import { registerGetAssetPeers } from './tools/getAssetPeers.js';
import { registerGetMarketRegime } from './tools/getMarketRegime.js';
import { registerAnalyzeAssetPrompt } from './prompts/analyzeAsset.js';

export function createMcpServer(assetService: AssetService): McpServer {
  const server = new McpServer({
    name: 'valueray-mcp',
    version: '1.0.0',
  });

  // Register tools (US1, US2, US3)
  registerGetAssetData(server, assetService);    // T018
  registerGetAssetPeers(server, assetService);   // T024
  registerGetMarketRegime(server, assetService); // T030

  // Register prompts (FR-005)
  registerAnalyzeAssetPrompt(server);            // T033

  return server;
}
