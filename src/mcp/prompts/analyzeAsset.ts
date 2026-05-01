// src/mcp/prompts/analyzeAsset.ts
// MCP Prompt: analyze_asset — FR-005 (Q5 clarification)
// Encadeia as 3 tools em sequência para análise completa de um ativo.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAnalyzeAssetPrompt(server: McpServer): void {
  server.prompt(
    'analyze_asset',
    'Comprehensive asset analysis prompt that chains all three Valueray tools: get_asset_data → get_asset_peers → get_market_regime to deliver a complete picture of a stock or ETF in its market context.',
    {
      symbol: z.string().describe('Ticker symbol to analyze (e.g. "AAPL", "SPY")'),
      exchange: z.string().optional().describe('Exchange identifier, optional (e.g. "NASDAQ")'),
    },
    ({ symbol, exchange }) => {
      const exchangeNote = exchange ? ` on ${exchange}` : '';
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform a comprehensive analysis of ${symbol}${exchangeNote} using the following steps:

1. **Asset Data**: Call \`get_asset_data\` with symbol="${symbol}"${exchange ? ` and exchange="${exchange}"` : ''} to retrieve technical indicators, risk metrics, performance data, sentiment, and dividends.

2. **Peer Comparison**: Call \`get_asset_peers\` with symbol="${symbol}" to understand how the asset ranks within its GICS sub-industry peers across valuation, profitability, and performance dimensions.

3. **Market Regime**: Call \`get_market_regime\` (no parameters) to obtain the current market environment — VIX/SKEW levels, breadth signals, and industry rotation trends.

After gathering all three responses, synthesize the data into a structured analysis covering:
- **Technical & Fundamental Summary**: Key price levels, trend direction, valuation vs. peers
- **Relative Strength**: How this asset compares to its sector peers
- **Market Context**: Whether the current regime (risk-on/risk-off, sector rotation) supports or challenges a position in this asset
- **Key Risks**: Notable risk factors from the data (beta, drawdown, rate limits)
- **Conclusion**: A concise investment thesis or caution flags based on the evidence`,
            },
          },
        ],
      };
    },
  );
}
