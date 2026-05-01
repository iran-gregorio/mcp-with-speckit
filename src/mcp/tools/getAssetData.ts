// src/mcp/tools/getAssetData.ts
// MCP Tool: get_asset_data — US1 (P1 MVP)
// Returns full Valueray symbolData JSON for a stock or ETF.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AssetService } from '../../application/assetService.js';

const inputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .describe('Ticker symbol (e.g. "AAPL", "SPY"). Case-insensitive.'),
  exchange: z
    .string()
    .optional()
    .describe('Exchange identifier (e.g. "NASDAQ"). Optional.'),
});

export function registerGetAssetData(server: McpServer, assetService: AssetService): void {
  server.tool(
    'get_asset_data',
    'Fetch technical, risk, performance, sentiment and dividend data for a stock or ETF from Valueray. Returns the complete JSON response.',
    inputSchema.shape,
    async ({ symbol, exchange }) => {
      try {
        const result = await assetService.getAssetData(symbol, exchange);
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
