// tests/integration/getAssetPeers.test.ts
// Integration tests for get_asset_peers MCP tool — US2
// Uses InMemoryTransport + Client pattern (MCP SDK v1.x standard)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/mcp/server.js';
import { AssetService } from '../../src/application/assetService.js';
import { AssetNotFoundError } from '../../src/domain/errors.js';
import symbolPeersFixture from '../fixtures/symbolPeers.json' assert { type: 'json' };

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

describe('MCP Tool: get_asset_peers', () => {
  let assetService: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    assetService = new AssetService(mockClient as never);
  });

  it('returns JSON-parseable text content for a valid stock symbol', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolPeersFixture);

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_asset_peers', arguments: { symbol: 'AAPL' } });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(parsed).toHaveProperty('symbol', 'AAPL');
  });

  it('returns passthrough for ETF symbol without error', async () => {
    const etfResponse = { symbol: 'SPY', peers: [] };
    mockFetchRaw.mockResolvedValueOnce(etfResponse);

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_asset_peers', arguments: { symbol: 'SPY' } });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(parsed).toHaveProperty('symbol', 'SPY');
  });

  it('returns isError:true for an unknown symbol', async () => {
    mockFetchRaw.mockRejectedValueOnce(new AssetNotFoundError('XYZXYZ'));

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_asset_peers', arguments: { symbol: 'XYZXYZ' } });

    expect(result.isError).toBe(true);
  });
});
