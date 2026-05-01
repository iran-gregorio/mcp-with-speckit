// src/mcp/tools/getMarketRegime.ts
// MCP Tool: get_market_regime — US3
// Returns full Valueray marketRegime JSON. No parameters (clarification Q4).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AssetService } from '../../application/assetService.js';

export function registerGetMarketRegime(server: McpServer, assetService: AssetService): void {
  server.tool(
    'get_market_regime',
    'Fetch current global market regime indicators from Valueray, including regime_values (VIX, SKEW, MOVE, TRIN), regime_signals, and industry_rotation data. No input parameters required.',
    z.object({}).shape,
    async () => {
      try {
        const result = await assetService.getMarketRegime();
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
