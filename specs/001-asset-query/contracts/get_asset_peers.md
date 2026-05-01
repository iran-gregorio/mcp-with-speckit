# MCP Tool Contract: get_asset_peers

**Tool name**: `get_asset_peers`
**File**: `src/mcp/tools/getAssetPeers.ts`
**User Story**: US2 (P2)
**Spec requirement**: FR-003

---

## Description

Returns the percentile rankings of a stock within its GICS sub-industry peers across
valuation, profitability, and performance dimensions, plus the top 5 peers by
Relative Strength.

---

## Input Schema

```typescript
z.object({
  symbol: z.string().min(1).max(10)
    .transform((s) => s.toUpperCase())
    .describe('Ticker symbol to compare against sector peers (e.g. "AAPL")'),
})
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | ✅ | Ticker symbol, auto-uppercased |

---

## Output

Returns MCP `content` array with a single `text` item containing the JSON-serialized
`AssetPeers` object.

### Success response shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"symbol\":\"AAPL\",\"sector\":\"Information Technology\",\"subIndustry\":\"Technology Hardware\",\"valuationPercentile\":{\"pe\":72,\"ps\":81,\"pb\":95},\"profitabilityPercentile\":{\"roic\":88,\"roe\":92},\"performancePercentile\":{\"1y\":79},\"topPeersByRS\":[\"MSFT\",\"NVDA\",\"AVGO\",\"QCOM\",\"AMD\"]}"
    }
  ]
}
```

### ETF — no peers available

```json
{
  "content": [
    {
      "type": "text",
      "text": "Peer comparison is not available for ETFs. Symbol SPY is an ETF."
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
| Symbol is an ETF | `Error` | `"Peer comparison is not available for ETFs."` |
| Rate limit hit (429) | `RateLimitError` | `"Valueray API rate limit reached. Try again later."` |
| Valueray API error (5xx) | `ValuerayApiError` | `"Valueray API error [5xx] at /stocks/{symbol}/peers: {message}"` |

---

## Valueray API Mapping

```
GET https://api.valueray.com/v1/stocks/{symbol}/peers
```

> Path to be validated empirically in T-infra-01.
