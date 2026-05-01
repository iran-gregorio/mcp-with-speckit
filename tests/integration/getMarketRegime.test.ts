// tests/integration/getMarketRegime.test.ts
// Integration tests for get_market_regime MCP tool — US3
// Uses InMemoryTransport + Client pattern (MCP SDK v1.x standard)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/mcp/server.js';
import { AssetService } from '../../src/application/assetService.js';
import marketRegimeFixture from '../fixtures/marketRegime.json' assert { type: 'json' };

const mockFetchRaw = vi.fn();
const mockClient = { fetchRaw: mockFetchRaw };

async function createTestClient(assetService: AssetService) {
  const server = createMcpServer(assetService);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

describe('MCP Tool: get_market_regime', () => {
  let assetService: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    assetService = new AssetService(mockClient as never);
  });

  it('returns JSON-parseable text with regime_values, regime_signals, industry_rotation', async () => {
    mockFetchRaw.mockResolvedValueOnce(marketRegimeFixture);

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_market_regime', arguments: {} });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(parsed).toHaveProperty('regime_values');
    expect(parsed).toHaveProperty('regime_signals');
    expect(parsed).toHaveProperty('industry_rotation');
  });

  it('accepts empty object as input (no parameters required)', async () => {
    mockFetchRaw.mockResolvedValueOnce(marketRegimeFixture);

    const client = await createTestClient(assetService);
    await expect(
      client.callTool({ name: 'get_market_regime', arguments: {} }),
    ).resolves.toBeDefined();
  });
});
