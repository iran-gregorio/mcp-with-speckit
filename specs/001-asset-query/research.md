# Research: Consulta de Ativos

**Branch**: `001-asset-query` | **Date**: 2026-04-30

## 1. Valueray API

### Decision
Use Valueray REST API at base URL `https://api.valueray.com/v1`.
No API key required for the free plan; rate limiting is IP-based (~30 req/h for
asset detail endpoints).

### Endpoints mapped to feature tools

| Tool | Method | Path | Key query params |
|------|--------|------|-----------------|
| `get_asset_data` | GET | `/stocks/{symbol}` and/or `/etf/{symbol}` | `symbol` (path param), optional `exchange` |
| `get_asset_peers` | GET | `/stocks/{symbol}/peers` | `symbol` (path param) |
| `get_market_regime` | GET | `/markets/regime` | none |

> **Note**: The `apis.json` reference at `https://www.valueray.com/api/v1/apis.json`
> returned HTTP 403 during planning. Exact endpoint paths MUST be verified empirically
> during implementation (T-infra-01). The paths above are derived from Valueray's
> publicly observed API patterns. The `ValuerayClient` MUST be the single place
> where these are hardcoded, so any correction is a one-line change.

### Response shape (expected, to be validated)

**Asset data** (`get_asset_data`):
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "exchange": "NASDAQ",
  "price": 172.50,
  "technicals": { "sma50": 168.2, "sma200": 155.1, "rsi14": 61.3 },
  "risk": { "beta": 1.22, "sharpe": 1.84, "maxDrawdown": -0.27 },
  "performance": { "1m": 0.032, "3m": 0.11, "ytd": 0.18, "1y": 0.24 },
  "sentiment": { "analystRating": "Buy", "targetPrice": 195.0 },
  "dividends": { "yield": 0.0055, "payoutRatio": 0.15 }
}
```

**Asset peers** (`get_asset_peers`):
```json
{
  "symbol": "AAPL",
  "sector": "Information Technology",
  "subIndustry": "Technology Hardware",
  "valuationPercentile": { "pe": 72, "ps": 81, "pb": 95 },
  "profitabilityPercentile": { "roic": 88, "roe": 92 },
  "performancePercentile": { "1y": 79 },
  "topPeersByRS": ["MSFT", "NVDA", "AVGO", "QCOM", "AMD"]
}
```

**Market regime** (`get_market_regime`):
```json
{
  "regime": { "vix": 18.2, "skew": 132, "move": 89, "trin": 1.1 },
  "breadth": { "advDecLine": 1.4, "newHighsLows": 0.72 },
  "sectorRotation": [
    { "sector": "Technology", "relativeStrength6w": 0.12 },
    { "sector": "Energy", "relativeStrength6w": -0.08 }
  ]
}
```

### Rationale
- Single HTTP client class isolates all Valueray API details
- Zod schemas validate responses at the boundary, preventing shape surprises from
  propagating into the MCP tools

### Alternatives considered
- **Axios**: Rejected — `fetch` is built into Node 20, no extra dep needed
- **OpenAPI-generated client**: Rejected — OpenAPI spec not publicly accessible (403)

---

## 2. MCP SDK

### Decision
Use `@modelcontextprotocol/sdk` **v1.x (stable, v1.29.0)**.
The v2 branch is pre-alpha as of 2026-04. Do not use v2 for this feature.

The SDK provides:
- `McpServer` — server instance with `registerTool()` and `registerPrompt()` APIs
- `StdioServerTransport` — transport for local stdio communication
- Zod integration via Standard Schema — tool `inputSchema` accepts Zod objects directly

### Minimal server pattern
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'valueray-mcp', version: '1.0.0' });

server.registerTool('get_asset_data', {
  description: 'Fetch technical, risk and performance data for a stock or ETF',
  inputSchema: z.object({
    symbol: z.string().describe('Ticker symbol (e.g. AAPL, SPY)'),
    exchange: z.string().optional().describe('Exchange (optional)'),
  }),
}, async ({ symbol, exchange }) => {
  // call AssetService
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Rationale
- v1.x is the production-recommended version with stable API surface
- stdio transport requires zero infrastructure (no HTTP port, no auth)
- Zod inputSchema provides automatic parameter validation at tool boundary

### Alternatives considered
- **Streamable HTTP transport**: Rejected — requires a running HTTP server, not aligned
  with "run local" requirement
- **MCP SDK v2**: Rejected — pre-alpha, API surface may change before stable release

---

## 3. TypeScript Configuration

### Decision
- `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` for native ESM
- `"strict": true` — full TypeScript strictness
- `"target": "ES2022"` — Node 20 supports all ES2022 features natively
- Build: `tsc` to `dist/` for production; `tsx` or `ts-node` for development

### Rationale
The MCP SDK ships as ESM. `NodeNext` resolution is required to correctly resolve
`.js` extension imports that the SDK uses internally.

---

## 4. Testing Strategy

### Decision
Use **Vitest** for all tests (unit + integration).

- **Unit tests**: `AssetService` with a mocked `ValuerayClient` (vi.mock or manual mock).
  Tests validate symbol normalization, error propagation, data mapping.
- **Unit tests**: `ValuerayClient` with a mocked `fetch` (vi.mock of global fetch).
  Tests validate URL construction, response parsing, HTTP error handling.
- **Integration tests**: Spawn MCP tools via `server.callTool()` in-process.
  Tests validate tool contracts end-to-end against a mock ValuerayClient.

### CI
- Script: `vitest run --reporter=verbose`
- CI fails if any test breaks (headless mode, no watch)

### Alternatives considered
- **Jest**: Rejected — Vitest is faster, ESM-native, no transform config needed
- **Mocha/Chai**: Rejected — more setup, less TypeScript-friendly

---

## 5. Resolved Unknowns from Technical Context

| Unknown | Resolution |
|---------|------------|
| Exact Valueray endpoint paths | Documented as best-effort above; must be validated in T-infra-01 with a real HTTP call |
| Valueray API auth | No auth required for free plan (IP-rate-limited) |
| MCP SDK version to use | v1.29.0 (stable) |
| Test framework | Vitest |
| Node version | Node 20 LTS |
| Server access control | TOKEN_SERVICE env var — presence-only validation (FR-010) |

---

## 6. TOKEN_SERVICE Authentication (FR-010)

### Decision
Require a mandatory `TOKEN_SERVICE` environment variable at server startup.
Validation is **presence-only** — the server checks that the variable exists and
is non-empty but does NOT validate format, cryptographic properties, or authenticate
against any external service.

### Implementation approach
- Validate in `src/index.ts` immediately after `dotenv/config` loads, before any
  MCP infrastructure is constructed
- On failure: write descriptive error to `stderr` and `process.exit(1)`
- The variable is a secret — NOT included in the tracked `.env` file
- Operators configure it in the MCP client settings (e.g., `claude_desktop_config.json`
  `env` section)

### Rationale
- **Startup guard** is the simplest correct pattern for mandatory configuration
- Validating at entrypoint (not server factory) keeps `createMcpServer()` testable
  without environment side-effects
- Presence-only validation is sufficient for v1 — future iterations can add token
  verification against an auth service

### Alternatives considered
- **Validate in server factory**: Rejected — mixes deployment config with business logic
- **Validate per-request**: Rejected — wasteful to check on every tool call when the
  value never changes during a session
- **Full token verification**: Deferred — spec explicitly says "somente a existência"
