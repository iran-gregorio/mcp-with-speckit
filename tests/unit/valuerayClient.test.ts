// tests/unit/valuerayClient.test.ts
// Unit tests for ValuerayClient — written FIRST per constitution II.
// Tests MUST FAIL before T010 implementation is complete.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValuerayApiError, AssetNotFoundError, RateLimitError } from '../../src/domain/errors.js';

// Dynamic import to allow mocking fetch before module loads
const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

// Import after stubbing
const { ValuerayClient } = await import('../../src/infrastructure/valuerayClient.js');

describe('ValuerayClient', () => {
  const baseUrl = 'https://www.valueray.com/api/v1';
  let client: InstanceType<typeof ValuerayClient>;

  beforeEach(() => {
    client = new ValuerayClient(baseUrl);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchRaw', () => {
    it('returns parsed JSON stripping disclaimer and field_explanations keys', async () => {
      const rawResponse = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 172.5,
        disclaimer: 'Data provided for informational purposes only.',
        field_explanations: { price: 'Current market price' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => rawResponse,
      });

      const result = await client.fetchRaw('/symbolData?symbol=AAPL') as Record<string, unknown>;

      expect(result).not.toHaveProperty('disclaimer');
      expect(result).not.toHaveProperty('field_explanations');
      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('price', 172.5);
    });

    it('constructs the correct URL from base + path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'ok' }),
      });

      await client.fetchRaw('/symbolData?symbol=AAPL');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/symbolData?symbol=AAPL`,
        expect.any(Object),
      );
    });

    it('throws AssetNotFoundError on HTTP 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(client.fetchRaw('/symbolData?symbol=XYZXYZ')).rejects.toThrow(
        AssetNotFoundError,
      );
    });

    it('throws RateLimitError on HTTP 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      });

      await expect(client.fetchRaw('/symbolData?symbol=AAPL')).rejects.toThrow(
        RateLimitError,
      );
    });

    it('throws ValuerayApiError on HTTP 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(client.fetchRaw('/symbolData?symbol=AAPL')).rejects.toThrow(
        ValuerayApiError,
      );
    });

    it('throws ValuerayApiError with status code and endpoint info on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      const error = await client.fetchRaw('/symbolData?symbol=AAPL').catch((e) => e);
      expect(error).toBeInstanceOf(ValuerayApiError);
      expect((error as ValuerayApiError).statusCode).toBe(503);
      expect((error as ValuerayApiError).endpoint).toBe('/symbolData?symbol=AAPL');
    });

    it('propagates network errors as Error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      await expect(client.fetchRaw('/symbolData?symbol=AAPL')).rejects.toThrow(
        'Network unreachable',
      );
    });
  });
});
