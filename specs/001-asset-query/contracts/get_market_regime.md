# MCP Tool Contract: get_market_regime

**Tool name**: `get_market_regime`
**File**: `src/mcp/tools/getMarketRegime.ts`
**User Story**: US3 (P3)
**Spec requirement**: FR-004

---

## Description

Returns the current global market regime indicators including volatility metrics
(VIX, SKEW, MOVE, TRIN), breadth signals, and sector rotation data for the past
6 weeks.

---

## Input Schema

```typescript
z.object({})  // No required parameters
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No input parameters |

---

## Output

Returns MCP `content` array with a single `text` item containing the JSON-serialized
`MarketRegime` object.

### Success response shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"regime\":{\"vix\":18.2,\"skew\":132,\"move\":89,\"trin\":1.1},\"breadth\":{\"advDecLine\":1.4,\"newHighsLows\":0.72},\"sectorRotation\":[{\"sector\":\"Technology\",\"relativeStrength6w\":0.12},{\"sector\":\"Energy\",\"relativeStrength6w\":-0.08}]}"
    }
  ]
}
```

---

## Error Conditions

| Condition | Error thrown | Message to client |
|-----------|-------------|-------------------|
| Rate limit hit (429) | `RateLimitError` | `"Valueray API rate limit reached. Try again later."` |
| Valueray API error (5xx) | `ValuerayApiError` | `"Valueray API error [5xx] at /markets/regime: {message}"` |
| Network unreachable | `Error` | `"Failed to connect to Valueray API: {message}"` |

---

## Valueray API Mapping

```
GET https://api.valueray.com/v1/markets/regime
```

> Path to be validated empirically in T-infra-01.
