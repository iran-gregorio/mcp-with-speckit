# MCP Tool Contract: get_asset_data

**Tool name**: `get_asset_data`
**File**: `src/mcp/tools/getAssetData.ts`
**User Story**: US1 (P1 — MVP)
**Spec requirement**: FR-002

---

## Description

Fetch technical, risk, performance, sentiment and dividend data for a given stock or
ETF from the Valueray API.

---

## Input Schema

```typescript
z.object({
  symbol: z.string().min(1).max(10)
    .transform((s) => s.toUpperCase())
    .describe('Ticker symbol (e.g. "AAPL", "SPY"). Case-insensitive.'),
  exchange: z.string().optional()
    .describe('Exchange identifier (e.g. "NASDAQ"). Optional.'),
})
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | ✅ | Ticker symbol, auto-uppercased |
| `exchange` | string | ❌ | Exchange identifier |

---

## Output

Returns MCP `content` array with a single `text` item containing the JSON-serialized
`AssetData` object.

### Success response shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"symbol\":\"AAPL\",\"name\":\"Apple Inc.\",\"exchange\":\"NASDAQ\",\"price\":172.50,\"technicals\":{\"sma50\":168.2,\"sma200\":155.1,\"rsi14\":61.3},\"risk\":{\"beta\":1.22,\"sharpe\":1.84,\"maxDrawdown\":-0.27},\"performance\":{\"1m\":0.032,\"3m\":0.11,\"ytd\":0.18,\"1y\":0.24},\"sentiment\":{\"analystRating\":\"Buy\",\"targetPrice\":195.0},\"dividends\":{\"yield\":0.0055,\"payoutRatio\":0.15}}"
    }
  ]
}
```

### Error response shape (any error)

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Asset not found: XYZXYZ"
    }
  ],
  "isError": true
}
```

---

## Error Conditions

| Condition | Error thrown | Message to client |
|-----------|-------------|-------------------|
| Symbol not found (404) | `AssetNotFoundError` | `"Asset not found: {symbol}"` |
| Rate limit hit (429) | `RateLimitError` | `"Valueray API rate limit reached. Try again later."` |
| Valueray API error (5xx) | `ValuerayApiError` | `"Valueray API error [5xx] at /stocks/{symbol}: {message}"` |
| Network timeout / unreachable | `Error` | `"Failed to connect to Valueray API: {message}"` |

---

## Valueray API Mapping

```
GET https://api.valueray.com/v1/stocks/{symbol}?exchange={exchange}
```

> Path to be validated empirically in T-infra-01. ETFs may use `/etf/{symbol}`.
