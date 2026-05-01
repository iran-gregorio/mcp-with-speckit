// src/application/assetService.ts
// Application service: orchestrates ValuerayClient calls for all MCP tools.
// Implements US1 (getAssetData), US2 (getAssetPeers), US3 (getMarketRegime).

import type { ValuerayClient } from '../infrastructure/valuerayClient.js';

export class AssetService {
  constructor(private readonly client: ValuerayClient) {}

  /**
   * US1: Fetch full asset data for a stock or ETF.
   * Symbol is normalized to uppercase (FR-007).
   * Returns the Valueray API JSON passthrough (minus disclaimer/field_explanations).
   */
  async getAssetData(symbol: string, exchange?: string): Promise<unknown> {
    const sym = symbol.toUpperCase();
    let path = `/symbolData?symbol=${encodeURIComponent(sym)}`;
    if (exchange) {
      path += `&exchange=${encodeURIComponent(exchange)}`;
    }
    return this.client.fetchRaw(path);
  }

  /**
   * US2: Fetch peer comparison data for a stock.
   * Pure passthrough — no special ETF detection (clarification Q3).
   */
  async getAssetPeers(symbol: string): Promise<unknown> {
    const sym = symbol.toUpperCase();
    return this.client.fetchRaw(`/symbolPeers?symbol=${encodeURIComponent(sym)}`);
  }

  /**
   * US3: Fetch current market regime indicators.
   * No input parameters — full passthrough of /marketRegime endpoint.
   */
  async getMarketRegime(): Promise<unknown> {
    return this.client.fetchRaw('/marketRegime');
  }
}
