# Data Model: Consulta de Ativos

**Branch**: `001-asset-query` | **Date**: 2026-04-30

All types live in `src/domain/asset.ts` and `src/domain/errors.ts`.
Zod schemas serve as both runtime validators and TypeScript type sources.

---

## Core Domain Types

### AssetInput

Input for the `get_asset_data` tool. Validated at MCP tool boundary.

```typescript
import { z } from 'zod';

export const AssetInputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.toUpperCase())
    .describe('Ticker symbol, e.g. AAPL or SPY'),
  exchange: z
    .string()
    .optional()
    .describe('Exchange identifier, e.g. NASDAQ (optional)'),
});

export type AssetInput = z.infer<typeof AssetInputSchema>;
```

**Validation rules**:
- `symbol`: required, 1–10 chars, auto-normalized to uppercase (FR-007)
- `exchange`: optional string

---

### AssetData

Full asset data returned by `get_asset_data`. Reflects Valueray API response shape.

```typescript
export const TechnicalsSchema = z.object({
  sma50: z.number().nullable(),
  sma200: z.number().nullable(),
  rsi14: z.number().nullable(),
});

export const RiskSchema = z.object({
  beta: z.number().nullable(),
  sharpe: z.number().nullable(),
  maxDrawdown: z.number().nullable(),
});

export const PerformanceSchema = z.object({
  '1m': z.number().nullable(),
  '3m': z.number().nullable(),
  ytd: z.number().nullable(),
  '1y': z.number().nullable(),
});

export const SentimentSchema = z.object({
  analystRating: z.string().nullable(),
  targetPrice: z.number().nullable(),
});

export const DividendsSchema = z.object({
  yield: z.number().nullable(),
  payoutRatio: z.number().nullable(),
});

export const AssetDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().nullable(),
  price: z.number().nullable(),
  technicals: TechnicalsSchema,
  risk: RiskSchema,
  performance: PerformanceSchema,
  sentiment: SentimentSchema,
  dividends: DividendsSchema,
});

export type AssetData = z.infer<typeof AssetDataSchema>;
```

---

### AssetPeersInput / AssetPeers

Input and output for `get_asset_peers`.

```typescript
export const AssetPeersInputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.toUpperCase())
    .describe('Ticker symbol to compare against sector peers'),
});

export type AssetPeersInput = z.infer<typeof AssetPeersInputSchema>;

export const PercentileGroupSchema = z.object({
  pe: z.number().nullable().optional(),
  ps: z.number().nullable().optional(),
  pb: z.number().nullable().optional(),
  roic: z.number().nullable().optional(),
  roe: z.number().nullable().optional(),
  '1y': z.number().nullable().optional(),
});

export const AssetPeersSchema = z.object({
  symbol: z.string(),
  sector: z.string().nullable(),
  subIndustry: z.string().nullable(),
  valuationPercentile: PercentileGroupSchema,
  profitabilityPercentile: PercentileGroupSchema,
  performancePercentile: PercentileGroupSchema,
  topPeersByRS: z.array(z.string()),
});

export type AssetPeers = z.infer<typeof AssetPeersSchema>;
```

---

### MarketRegime

Output for `get_market_regime` (no input required).

```typescript
export const RegimeIndicatorsSchema = z.object({
  vix: z.number().nullable(),
  skew: z.number().nullable(),
  move: z.number().nullable(),
  trin: z.number().nullable(),
});

export const BreadthSchema = z.object({
  advDecLine: z.number().nullable(),
  newHighsLows: z.number().nullable(),
});

export const SectorRotationEntrySchema = z.object({
  sector: z.string(),
  relativeStrength6w: z.number(),
});

export const MarketRegimeSchema = z.object({
  regime: RegimeIndicatorsSchema,
  breadth: BreadthSchema,
  sectorRotation: z.array(SectorRotationEntrySchema),
});

export type MarketRegime = z.infer<typeof MarketRegimeSchema>;
```

---

## Error Types

```typescript
// src/domain/errors.ts

export class ValuerayApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(`Valueray API error [${statusCode}] at ${endpoint}: ${message}`);
    this.name = 'ValuerayApiError';
  }
}

export class AssetNotFoundError extends Error {
  constructor(public readonly symbol: string) {
    super(`Asset not found: ${symbol}`);
    this.name = 'AssetNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Valueray API rate limit reached. Try again later.');
    this.name = 'RateLimitError';
  }
}
```

---

## Entity Relationships

```
AssetInput (symbol, exchange?)
    │
    ▼
AssetService.getAssetData()
    │
    ├──► ValuerayClient.fetchAsset(symbol, exchange?) ──► AssetDataSchema.parse()
    │                                                           │
    │                                                           ▼
    │                                                       AssetData
    │
    ├──► ValuerayClient.fetchAssetPeers(symbol) ──► AssetPeersSchema.parse()
    │                                                     │
    │                                                     ▼
    │                                                 AssetPeers
    │
    └──► ValuerayClient.fetchMarketRegime() ──► MarketRegimeSchema.parse()
                                                      │
                                                      ▼
                                                  MarketRegime
```

---

## Validation Rules Summary

| Field | Rule | Source |
|-------|------|--------|
| `symbol` | Required, 1–10 chars, uppercase | FR-007 |
| `exchange` | Optional string | FR-002 |
| All numeric fields | Nullable (API may omit) | Resilience |
| Error HTTP 404 | Throws `AssetNotFoundError` | FR-008, SC-003 |
| Error HTTP 429 | Throws `RateLimitError` | FR-008 |
| Error HTTP 5xx | Throws `ValuerayApiError` | FR-008 |
