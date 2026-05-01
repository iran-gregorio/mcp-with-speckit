// tests/integration/getAssetData.test.ts
// Integration tests for get_asset_data MCP tool — US1
// Uses InMemoryTransport + Client pattern (MCP SDK v1.x standard)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/mcp/server.js';
import { AssetService } from '../../src/application/assetService.js';
import { AssetNotFoundError } from '../../src/domain/errors.js';
import symbolDataFixture from '../fixtures/symbolData.json' assert { type: 'json' };

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

describe('MCP Tool: get_asset_data', () => {
  let assetService: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    assetService = new AssetService(mockClient as never);
  });

  it('returns JSON-parseable text content for a valid symbol', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolDataFixture);

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_asset_data', arguments: { symbol: 'AAPL' } });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(parsed).toHaveProperty('symbol', 'AAPL');
  });

  it('returns isError:true for an unknown symbol', async () => {
    mockFetchRaw.mockRejectedValueOnce(new AssetNotFoundError('XYZXYZ'));

    const client = await createTestClient(assetService);
    const result = await client.callTool({ name: 'get_asset_data', arguments: { symbol: 'XYZXYZ' } });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain('XYZXYZ');
  });
});
