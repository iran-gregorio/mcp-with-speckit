# Quickstart: Consulta de Ativos MCP Server

**Branch**: `001-asset-query` | **Date**: 2026-04-30 | **Updated**: 2026-05-04

## Prerequisites

- Node.js 22 LTS (`node --version` → `v22.x.x`)
- npm 10+ or pnpm 9+
- A `TOKEN_SERVICE` access key (required — see step 4)

## 1. Install dependencies

```bash
npm install
```

## 2. Build

```bash
npm run build
# → compiles TypeScript to dist/
```

## 3. Run the MCP Server

```bash
# TOKEN_SERVICE is required — server refuses to start without it
TOKEN_SERVICE=your-access-key node dist/index.js
```

The server is now listening on **stdin/stdout** for MCP protocol messages.

> **Note**: If `TOKEN_SERVICE` is not set, the server will exit immediately with:
> `ERROR: TOKEN_SERVICE environment variable is required but not set.`

## 4. Connect with Claude Desktop (or any MCP client)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "valueray": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-with-speckit/dist/index.js"],
      "env": {
        "TOKEN_SERVICE": "your-access-key-here"
      }
    }
  }
}
```

> **⚠️ TOKEN_SERVICE is mandatory** (FR-010). The server validates its presence at
> startup. Do NOT commit this key to version control — configure it in the client.

Restart Claude Desktop. The tools `get_asset_data`, `get_asset_peers`, and
`get_market_regime` will appear in the tool list.

## 5. Test tools manually (MCP Inspector)

```bash
TOKEN_SERVICE=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

Then in the inspector UI:
- Call `get_asset_data` with `{ "symbol": "AAPL" }`
- Call `get_asset_peers` with `{ "symbol": "AAPL" }`
- Call `get_market_regime` with `{}`

## 6. Run tests

```bash
npm test
# → vitest run (headless, no watch)
```

## 7. Development mode (watch)

```bash
npm run dev
# → tsx watch src/index.ts (if configured) OR
# → vitest --watch for test-driven development
```

## Smoke Validation Checklist

- [ ] `TOKEN_SERVICE=test node dist/index.js` starts without error (SC-004, < 10s)
- [ ] `node dist/index.js` (without TOKEN_SERVICE) exits with clear error (SC-006)
- [ ] MCP Inspector lists 3 tools and 1 prompt (FR-001, FR-005)
- [ ] `get_asset_data { symbol: "AAPL" }` returns structured JSON (SC-001, SC-002)
- [ ] `get_asset_data { symbol: "XYZXYZ" }` returns error message, not crash (SC-003)
- [ ] `get_asset_peers { symbol: "AAPL" }` returns peer percentile data (US2)
- [ ] `get_market_regime {}` returns regime indicators (US3)
