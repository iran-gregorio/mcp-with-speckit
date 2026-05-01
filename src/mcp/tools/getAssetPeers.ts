// src/mcp/tools/getAssetPeers.ts
// MCP Tool: get_asset_peers — US2
// Returns full Valueray symbolPeers JSON. Pure passthrough — no ETF detection.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AssetService } from '../../application/assetService.js';

const inputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .describe('Ticker symbol to compare against sector peers (e.g. "AAPL").'),
});

export function registerGetAssetPeers(server: McpServer, assetService: AssetService): void {
  server.tool(
    'get_asset_peers',
    'Fetch peer comparison data for a stock from Valueray. Returns percentile rankings vs GICS sub-industry peers. Pure passthrough — ETFs return whatever the API provides.',
    inputSchema.shape,
    async ({ symbol }) => {
      try {
        const result = await assetService.getAssetPeers(symbol);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
