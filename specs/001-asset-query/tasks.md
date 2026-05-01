# Tasks: Consulta de Ativos (Asset Query) — MCP Server Valueray

**Input**: Design documents from `specs/001-asset-query/`
**Branch**: `001-asset-query`
**Stack**: Node.js 20 + TypeScript 5, `@modelcontextprotocol/sdk` v1.x, Zod v3, Vitest

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. Constitution requires tests for all service logic (Principles
II.1 and II.2) — test tasks are mandatory for services and tools.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Each task includes exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and base configuration.

- [x] T001 Initialize Node.js project with `npm init -y` and create `tsconfig.json` targeting ES2022/NodeNext at repo root
- [x] T002 Install runtime dependencies: `@modelcontextprotocol/sdk`, `zod`, `dotenv` — update `package.json`
- [x] T003 [P] Install dev dependencies: `typescript`, `vitest`, `@types/node`, `tsx` — update `package.json`
- [x] T004 [P] Configure `vitest.config.ts` with coverage, test globs `tests/**/*.test.ts`, and ESM support at repo root
- [x] T005 [P] Create `.env` file at repo root with `VALUERAY_BASE_URL=https://www.valueray.com/api/v1`
- [x] T006 [P] Create `.gitignore` excluding `node_modules/`, `dist/`, `.env.local` (keep `.env` tracked)
- [x] T007 Add `scripts` to `package.json`: `build` (`tsc`), `dev` (`tsx src/index.ts`), `test` (`vitest run`), `test:watch` (`vitest`)

**Checkpoint**: `npm install` and `npm test` (zero tests, passes) run without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by all user stories — `ValuerayClient`,
error types, and MCP server factory. **No user story work can begin until this phase is complete.**

- [x] T008 Create `src/domain/errors.ts` with `ValuerayApiError`, `AssetNotFoundError`, and `RateLimitError` classes
- [x] T009 Write unit tests for `ValuerayClient` error handling in `tests/unit/valuerayClient.test.ts` (mock `fetch`; test 404 → `AssetNotFoundError`, 429 → `RateLimitError`, 500 → `ValuerayApiError`) — **tests MUST FAIL before T010**
- [x] T010 Create `src/infrastructure/valuerayClient.ts` implementing `ValuerayClient` class with:
  - Constructor reads `process.env.VALUERAY_BASE_URL` with hardcoded fallback
  - Loads `.env` via `dotenv/config`
  - `fetchRaw(path: string): Promise<unknown>` — strips `disclaimer` and `field_explanations` keys from response
  - Throws typed errors from `src/domain/errors.ts` on HTTP 404, 429, 5xx
- [x] T011 Verify `valuerayClient.test.ts` tests now PASS (T009 tests green)
- [x] T012 Create `src/mcp/server.ts` exporting `createMcpServer(): McpServer` factory using `@modelcontextprotocol/sdk`
- [x] T013 Create `src/index.ts` entrypoint: calls `createMcpServer()`, connects `StdioServerTransport`, and starts listening

**Checkpoint**: `node --loader tsx src/index.ts` starts without error and waits on stdin.

---

## Phase 3: User Story 1 — Buscar dados de um ativo (Priority: P1) 🎯 MVP

**Goal**: A ferramenta `get_asset_data` retorna o JSON completo do endpoint
`/symbolData?symbol=AAPL` da Valueray API (passthrough, sem `disclaimer`/`field_explanations`).

**Independent Test**: Chamar `get_asset_data` com `{ symbol: "AAPL" }` via MCP Inspector
e receber JSON com dados do ativo. Chamar com `{ symbol: "XYZXYZ" }` e receber erro descritivo.

### Tests for User Story 1 ⚠️ Write FIRST — must FAIL before implementation

- [x] T014 [P] [US1] Write unit tests for `AssetService.getAssetData()` in `tests/unit/assetService.test.ts`:
  - Mock `ValuerayClient.fetchRaw` to return fixture JSON
  - Test symbol is uppercased before call (e.g., `"aapl"` → `"AAPL"`)
  - Test happy path returns the raw object as-is
  - Test `AssetNotFoundError` propagates correctly
- [x] T015 [P] [US1] Write integration tests for `get_asset_data` tool in `tests/integration/getAssetData.test.ts`:
  - Instantiate `McpServer` in-process with mocked `AssetService`
  - Test tool call with `{ symbol: "AAPL" }` returns `content[0].text` parseable JSON
  - Test tool call with `{ symbol: "XYZXYZ" }` returns `isError: true`

### Implementation for User Story 1

- [x] T016 [US1] Create `src/application/assetService.ts` with `AssetService` class:
  - Constructor takes `ValuerayClient` instance
  - `getAssetData(symbol: string, exchange?: string): Promise<unknown>` — normalizes symbol to uppercase, calls `valuerayClient.fetchRaw('/symbolData?symbol=...')`, returns result
- [x] T017 [US1] Create `src/mcp/tools/getAssetData.ts` — register tool on `McpServer`:
  - `inputSchema`: `z.object({ symbol: z.string().min(1).max(10), exchange: z.string().optional() })`
  - Handler: calls `assetService.getAssetData()`, returns `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
  - Catches all errors, returns `{ content: [{ type: 'text', text: error.message }], isError: true }`
- [x] T018 [US1] Wire `getAssetDataTool` into `src/mcp/server.ts` (import and register on server instance)
- [x] T019 [US1] Verify T014 and T015 tests now PASS

**Checkpoint**: `npx @modelcontextprotocol/inspector node dist/index.js` — call `get_asset_data { symbol: "AAPL" }` returns Valueray JSON. Symbols like `"aapl"` auto-uppercase. `"XYZXYZ"` returns error.

---

## Phase 4: User Story 2 — Comparativo com peers do setor (Priority: P2)

**Goal**: A ferramenta `get_asset_peers` retorna o JSON completo do endpoint
`/symbolPeers?symbol=AAPL` da Valueray API (passthrough, sem `disclaimer`/`field_explanations`).
ETFs são tratados como qualquer símbolo — passthrough puro.

**Independent Test**: Chamar `get_asset_peers` com `{ symbol: "AAPL" }` via MCP Inspector
e receber JSON com dados de peers. Independente de US1 estar ou não instalado.

### Tests for User Story 2 ⚠️ Write FIRST — must FAIL before implementation

- [x] T020 [P] [US2] Write unit tests for `AssetService.getAssetPeers()` in `tests/unit/assetService.test.ts` (append):
  - Mock `fetchRaw` returning fixture JSON
  - Test symbol uppercasing
  - Test passthrough for ETF symbol (e.g., `"SPY"`) — no special handling
- [x] T021 [P] [US2] Write integration tests for `get_asset_peers` tool in `tests/integration/getAssetPeers.test.ts`:
  - Test call `{ symbol: "AAPL" }` returns parseable JSON
  - Test call `{ symbol: "SPY" }` returns passthrough (no error forced)
  - Test call `{ symbol: "XYZXYZ" }` propagates `AssetNotFoundError`

### Implementation for User Story 2

- [x] T022 [US2] Add `getAssetPeers(symbol: string): Promise<unknown>` method to `src/application/assetService.ts`:
  - Normalizes symbol to uppercase, calls `valuerayClient.fetchRaw('/symbolPeers?symbol=...')`, returns result
- [x] T023 [US2] Create `src/mcp/tools/getAssetPeers.ts` — register tool on `McpServer`:
  - `inputSchema`: `z.object({ symbol: z.string().min(1).max(10) })`
  - Handler: calls `assetService.getAssetPeers()`, returns `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
  - Catches all errors, returns `{ content: [{ type: 'text', text: error.message }], isError: true }`
- [x] T024 [US2] Wire `getAssetPeersTool` into `src/mcp/server.ts`
- [x] T025 [US2] Verify T020 and T021 tests now PASS

**Checkpoint**: `get_asset_peers { symbol: "AAPL" }` returns peer JSON. `{ symbol: "SPY" }` returns passthrough (empty peers or valid response). Stories 1 and 2 both functional.

---

## Phase 5: User Story 3 — Regime de mercado global (Priority: P3)

**Goal**: A ferramenta `get_market_regime` retorna o JSON completo do endpoint
`/marketRegime` da Valueray API (passthrough, sem `disclaimer`/`field_explanations`).
Sem parâmetros de entrada.

**Independent Test**: Chamar `get_market_regime` com `{}` via MCP Inspector e receber
JSON com campos `regime_values`, `regime_signals`, `industry_rotation`.

### Tests for User Story 3 ⚠️ Write FIRST — must FAIL before implementation

- [x] T026 [P] [US3] Write unit tests for `AssetService.getMarketRegime()` in `tests/unit/assetService.test.ts` (append):
  - Mock `fetchRaw` returning fixture JSON with `regime_values`, `regime_signals`, `industry_rotation`
  - Test passthrough — result returned as-is
- [x] T027 [P] [US3] Write integration tests for `get_market_regime` tool in `tests/integration/getMarketRegime.test.ts`:
  - Test call `{}` returns parseable JSON with expected top-level keys

### Implementation for User Story 3

- [x] T028 [US3] Add `getMarketRegime(): Promise<unknown>` method to `src/application/assetService.ts`:
  - Calls `valuerayClient.fetchRaw('/marketRegime')`, returns result
- [x] T029 [US3] Create `src/mcp/tools/getMarketRegime.ts` — register tool on `McpServer`:
  - `inputSchema`: `z.object({})` (no parameters)
  - Handler: calls `assetService.getMarketRegime()`, returns `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
  - Catches all errors, returns `{ content: [{ type: 'text', text: error.message }], isError: true }`
- [x] T030 [US3] Wire `getMarketRegimeTool` into `src/mcp/server.ts`
- [x] T031 [US3] Verify T026 and T027 tests now PASS

**Checkpoint**: All 3 tools functional. `get_market_regime {}` returns regime JSON with `industry_rotation`.

---

## Phase 6: Prompt de Exemplo + Polish

**Purpose**: Expor o prompt encadeado (FR-005) e garantir qualidade final (SC-004, SC-005).

- [x] T032 Create `src/mcp/prompts/analyzeAsset.ts` — register prompt `analyze_asset` on `McpServer`:
  - Arguments: `symbol` (required), `exchange` (optional)
  - Template encadeia as 3 tools: instrui o agente a chamar `get_asset_data` → `get_asset_peers` → `get_market_regime` em sequência para análise completa do ativo no contexto do mercado
- [x] T033 Wire `analyzeAssetPrompt` into `src/mcp/server.ts`
- [x] T034 [P] Build TypeScript: `npm run build` — verify `dist/index.js` is generated without errors
- [x] T035 [P] Run `node dist/index.js` — verify server starts in < 10s (SC-004)
- [x] T036 [P] Run full test suite: `npm test` — all tests PASS, no skipped
- [x] T037 Update `specs/001-asset-query/quickstart.md` smoke validation checklist — mark items verified
- [x] T038 [P] Update `specs/001-asset-query/data-model.md` to reflect passthrough architecture (remove Zod schemas for domain types; keep only input validation schemas for tool `inputSchema`)
- [x] T039 [P] Update `specs/001-asset-query/contracts/` — update all 3 contracts to reflect real Valueray endpoint paths (`/symbolData`, `/symbolPeers`, `/marketRegime`)

**Checkpoint**: `npm test` green, `npm run build` clean, server starts, MCP Inspector lists 3 tools + 1 prompt.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — MVP increment
- **Phase 4 (US2)**: Depends on Phase 2 — can run in parallel with US1 after Phase 2
- **Phase 5 (US3)**: Depends on Phase 2 — can run in parallel with US1/US2 after Phase 2
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Only depends on Foundational (Phase 2) — no cross-story deps
- **US2 (P2)**: Only depends on Foundational (Phase 2) — independently testable
- **US3 (P3)**: Only depends on Foundational (Phase 2) — independently testable

### Within Each Story

1. Tests written **FIRST** and confirmed FAILING (constitution requirement)
2. Implementation makes tests pass
3. `isError` error handling verified
4. Story fully working before moving to next

### Parallel Opportunities

- T002, T003, T004, T005, T006 — all Phase 1 setup tasks (different files)
- T014, T015 — US1 test files (different files, write simultaneously)
- T020, T021 — US2 test files
- T026, T027 — US3 test files
- T034, T035, T036, T037, T038, T039 — Polish tasks (different files)
- US1, US2, US3 phases — all three can be implemented simultaneously by different developers after Phase 2

---

## Parallel Example: Phase 2 (Foundational)

```text
# Start simultaneously (different files, no deps):
T008 — src/domain/errors.ts
T009 — tests/unit/valuerayClient.test.ts  ← write tests FIRST

# Then (T008 + T009 must be done):
T010 — src/infrastructure/valuerayClient.ts  ← make T009 tests pass

# Then in parallel (T010 must be done):
T011 — verify tests pass
T012 — src/mcp/server.ts
T013 — src/index.ts
```

## Parallel Example: User Story 1

```text
# Simultaneously (different files):
T014 — tests/unit/assetService.test.ts    ← write tests FIRST, verify FAIL
T015 — tests/integration/getAssetData.test.ts ← write tests FIRST, verify FAIL

# Then (T014 must be done):
T016 — src/application/assetService.ts   ← make T014 pass

# Then in parallel (T016 must be done):
T017 — src/mcp/tools/getAssetData.ts
T018 — src/mcp/server.ts (wire tool)

# Final:
T019 — npm test (all green)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T007)
2. Complete Phase 2: Foundational (T008–T013) — **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T014–T019)
4. **STOP and VALIDATE**: Run MCP Inspector, test `get_asset_data`
5. Server is already useful — ship MVP

### Incremental Delivery

1. Phase 1 + 2 → server boots, no tools yet
2. Phase 3 → `get_asset_data` functional (MVP)
3. Phase 4 → `get_asset_peers` added
4. Phase 5 → `get_market_regime` added
5. Phase 6 → prompt + polish + all tests green

---

## Notes

- **Tests are mandatory** (Constitution II.1) for `AssetService` and `ValuerayClient`
- Write tests FIRST, verify they FAIL, then implement (Constitution II.2)
- `[P]` tasks = different files, no dependencies on incomplete tasks
- Passthrough architecture means NO Zod domain response schemas — only `z.object({})` input schemas
- The `.env` file is tracked (not gitignored) — contains only the public base URL
- Commit after each phase checkpoint minimum
- Each user story phase is independently deliverable — stop at any checkpoint to demo
