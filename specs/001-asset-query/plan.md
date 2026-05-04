# Implementation Plan: Consulta de Ativos (Asset Query)

**Branch**: `001-asset-query` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-asset-query/spec.md`

## Summary

MCP server that integrates with the Valueray API to provide asset data, peer comparisons,
and market regime indicators through MCP-compatible tools and prompts. The server uses
JSON passthrough architecture (stripping only `disclaimer` and `field_explanations` from
API responses) and communicates via stdio transport.

**FR-010 update (2026-05-04)**: The server now requires a mandatory `TOKEN_SERVICE`
environment variable. At startup, the server validates presence and non-emptiness of
this variable before initializing. If absent or empty, the server refuses to start
with a clear error message.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 (ESM, `"module": "NodeNext"`)
**Primary Dependencies**: `@modelcontextprotocol/sdk` v1.x, `zod` v3, `dotenv`
**Storage**: N/A — stateless passthrough to Valueray API
**Testing**: Vitest (unit + integration via `InMemoryTransport` + `Client`)
**Target Platform**: Local machine (stdio transport)
**Project Type**: MCP server (CLI-style, stdio)
**Performance Goals**: Server startup < 10s, tool response < 5s (excl. network latency)
**Constraints**: Rate limit ~30 req/h (Valueray free plan), single client
**Scale/Scope**: 3 tools, 1 prompt, 1 service, 1 infrastructure client

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. MCP Server-Client Architecture | ✅ PASS | `ValuerayClient` is the sole integration point; all data exposed via MCP tools |
| II.1 Service tests mandatory | ✅ PASS | `AssetService` and `ValuerayClient` have full unit test coverage; integration tests via `InMemoryTransport` |
| II.2 Bug fix = regression test | ✅ PASS | No bugs yet — will apply when needed |
| II.3 CI headless | ✅ PASS | `.github/workflows/ci.yml` runs `vitest run` on push/PR |
| III.1 Behavior change → update spec+plan | ✅ PASS | FR-010 (TOKEN_SERVICE) added to spec; this plan update follows |
| III.2 PRs small and traceable | ✅ PASS | PR template with checklist exists |

**No violations. No Complexity Tracking needed.**

## Project Structure

### Documentation (this feature)

```text
specs/001-asset-query/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (3 tool contracts)
│   ├── get_asset_data.md
│   ├── get_asset_peers.md
│   └── get_market_regime.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts                         # Entrypoint: dotenv, TOKEN_SERVICE validation, DI, stdio
├── domain/
│   └── errors.ts                    # ValuerayApiError, AssetNotFoundError, RateLimitError
├── infrastructure/
│   └── valuerayClient.ts            # Fetch client with metadata stripping
├── application/
│   └── assetService.ts              # Orchestration: symbol normalization + endpoint routing
└── mcp/
    ├── server.ts                    # McpServer factory with tool/prompt registration
    ├── tools/
    │   ├── getAssetData.ts          # Tool: get_asset_data (FR-002)
    │   ├── getAssetPeers.ts         # Tool: get_asset_peers (FR-003)
    │   └── getMarketRegime.ts       # Tool: get_market_regime (FR-004)
    └── prompts/
        └── analyzeAsset.ts          # Prompt: analyze_asset (FR-005)

tests/
├── unit/
│   ├── assetService.test.ts         # 12 tests: normalization, passthrough, error propagation
│   └── valuerayClient.test.ts       # 7 tests: fetch mock, error mapping, metadata stripping
├── integration/
│   ├── getAssetData.test.ts         # 2 tests via InMemoryTransport + Client
│   ├── getAssetPeers.test.ts        # 3 tests via InMemoryTransport + Client
│   └── getMarketRegime.test.ts      # 2 tests via InMemoryTransport + Client
└── fixtures/
    ├── symbolData.json
    ├── symbolPeers.json
    └── marketRegime.json

.github/
├── workflows/ci.yml                 # CI: npm install → test → build
└── pull_request_template.md         # Constitution III checklist
```

**Structure Decision**: Single-project layout with domain-driven layering
(`domain` → `infrastructure` → `application` → `mcp`). All tools share the
same `AssetService` injected into the MCP server factory.

## FR-010: TOKEN_SERVICE Implementation Design

### Approach

The `TOKEN_SERVICE` validation is a **startup guard** — it runs before any MCP
infrastructure is initialized. This is the simplest correct approach:

1. **Where**: In `src/index.ts`, immediately after `import 'dotenv/config'` loads
   environment variables, and **before** constructing `ValuerayClient`, `AssetService`,
   or `McpServer`.

2. **What**: Read `process.env.TOKEN_SERVICE`. If `undefined` or empty string (after
   trimming), write a clear error message to `stderr` and call `process.exit(1)`.

3. **Why at entrypoint (not in server factory)**: The TOKEN_SERVICE is a deployment
   configuration concern, not a business logic concern. Validating it in `index.ts`
   keeps the server factory (`createMcpServer`) testable without environment side-effects.

### Validation Logic

```typescript
// src/index.ts — after dotenv/config import
const token = process.env.TOKEN_SERVICE?.trim();
if (!token) {
  process.stderr.write(
    'ERROR: TOKEN_SERVICE environment variable is required but not set.\n' +
    'Configure it in your MCP client settings (e.g., claude_desktop_config.json).\n'
  );
  process.exit(1);
}
```

### Client Configuration Example

```json
{
  "mcpServers": {
    "valueray": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "TOKEN_SERVICE": "your-access-key-here"
      }
    }
  }
}
```

### Testing Strategy for FR-010

| Test Type | What | How |
|-----------|------|-----|
| Unit test | Startup rejects missing TOKEN_SERVICE | Spawn `node dist/index.js` without env var, assert exit code 1 and stderr contains error message |
| Unit test | Startup rejects empty TOKEN_SERVICE | Spawn with `TOKEN_SERVICE=""`, assert exit code 1 |
| Unit test | Startup succeeds with valid TOKEN_SERVICE | Spawn with `TOKEN_SERVICE="any-value"`, assert startup message appears |
| Integration | Existing tool tests still pass | All 26 existing tests run with `TOKEN_SERVICE` set in test env |

### Impact on Existing Code

| File | Change |
|------|--------|
| `src/index.ts` | Add TOKEN_SERVICE validation before server construction |
| `.env` | **NOT changed** — TOKEN_SERVICE is a secret, not tracked |
| `quickstart.md` | Update Claude Desktop config example with `env.TOKEN_SERVICE` |
| `tests/**` | Existing tests unaffected (they don't go through `index.ts`) |
| New: `tests/unit/tokenValidation.test.ts` | New test file for FR-010 |
