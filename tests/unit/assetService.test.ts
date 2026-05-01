// tests/unit/assetService.test.ts
// Unit tests for AssetService — covers US1, US2, US3.
// Written FIRST per constitution II. Mock ValuerayClient via vi.mock.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../../src/application/assetService.js';
import { AssetNotFoundError } from '../../src/domain/errors.js';
import symbolDataFixture from '../fixtures/symbolData.json' assert { type: 'json' };
import symbolPeersFixture from '../fixtures/symbolPeers.json' assert { type: 'json' };
import marketRegimeFixture from '../fixtures/marketRegime.json' assert { type: 'json' };

// --- Mock ValuerayClient ---
const mockFetchRaw = vi.fn();
const mockClient = { fetchRaw: mockFetchRaw };

// ============================================================
// US1: getAssetData
// ============================================================
describe('AssetService.getAssetData', () => {
  let service: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    service = new AssetService(mockClient as never);
  });

  it('returns the raw API response for a valid symbol', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolDataFixture);

    const result = await service.getAssetData('AAPL');

    expect(result).toEqual(symbolDataFixture);
  });

  it('normalizes symbol to uppercase before calling the API', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolDataFixture);

    await service.getAssetData('aapl');

    expect(mockFetchRaw).toHaveBeenCalledWith(
      expect.stringContaining('symbol=AAPL'),
    );
  });

  it('includes exchange in the query when provided', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolDataFixture);

    await service.getAssetData('AAPL', 'NASDAQ');

    expect(mockFetchRaw).toHaveBeenCalledWith(
      expect.stringContaining('exchange=NASDAQ'),
    );
  });

  it('omits exchange parameter when not provided', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolDataFixture);

    await service.getAssetData('AAPL');

    expect(mockFetchRaw).toHaveBeenCalledWith(
      expect.not.stringContaining('exchange='),
    );
  });

  it('propagates AssetNotFoundError from the client', async () => {
    mockFetchRaw.mockRejectedValueOnce(new AssetNotFoundError('XYZXYZ'));

    await expect(service.getAssetData('XYZXYZ')).rejects.toThrow(AssetNotFoundError);
  });
});

// ============================================================
// US2: getAssetPeers
// ============================================================
describe('AssetService.getAssetPeers', () => {
  let service: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    service = new AssetService(mockClient as never);
  });

  it('returns the raw API response for a valid stock symbol', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolPeersFixture);

    const result = await service.getAssetPeers('AAPL');

    expect(result).toEqual(symbolPeersFixture);
  });

  it('normalizes symbol to uppercase (shared AssetService behaviour — US1 coverage applies)', async () => {
    mockFetchRaw.mockResolvedValueOnce(symbolPeersFixture);

    await service.getAssetPeers('aapl');

    expect(mockFetchRaw).toHaveBeenCalledWith(expect.stringContaining('symbol=AAPL'));
  });

  it('returns passthrough for ETF symbol — no special handling', async () => {
    const etfResponse = { symbol: 'SPY', peers: [] };
    mockFetchRaw.mockResolvedValueOnce(etfResponse);

    const result = await service.getAssetPeers('SPY');

    // No error thrown, raw response returned as-is
    expect(result).toEqual(etfResponse);
  });

  it('propagates AssetNotFoundError from the client', async () => {
    mockFetchRaw.mockRejectedValueOnce(new AssetNotFoundError('XYZXYZ'));

    await expect(service.getAssetPeers('XYZXYZ')).rejects.toThrow(AssetNotFoundError);
  });
});

// ============================================================
// US3: getMarketRegime
// ============================================================
describe('AssetService.getMarketRegime', () => {
  let service: AssetService;

  beforeEach(() => {
    mockFetchRaw.mockReset();
    service = new AssetService(mockClient as never);
  });

  it('returns the raw marketRegime API response', async () => {
    mockFetchRaw.mockResolvedValueOnce(marketRegimeFixture);

    const result = await service.getMarketRegime();

    expect(result).toEqual(marketRegimeFixture);
  });

  it('calls the correct /marketRegime endpoint with no params', async () => {
    mockFetchRaw.mockResolvedValueOnce(marketRegimeFixture);

    await service.getMarketRegime();

    expect(mockFetchRaw).toHaveBeenCalledWith('/marketRegime');
  });

  it('returns passthrough — result is not transformed', async () => {
    const rawResponse = { regime_values: { vix: 20 }, industry_rotation: [] };
    mockFetchRaw.mockResolvedValueOnce(rawResponse);

    const result = await service.getMarketRegime();

    expect(result).toStrictEqual(rawResponse);
  });
});
