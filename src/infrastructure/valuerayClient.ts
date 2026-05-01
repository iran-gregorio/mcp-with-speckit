// src/infrastructure/valuerayClient.ts
// HTTP client for the Valueray REST API.
// This is the SOLE integration point with Valueray — no other module may call
// Valueray directly (Constitution Principle I).

import 'dotenv/config';
import { AssetNotFoundError, RateLimitError, ValuerayApiError } from '../domain/errors.js';

const STRIPPED_KEYS = new Set(['disclaimer', 'field_explanations']);

/**
 * Remove top-level keys that are informational-only and not useful to MCP clients.
 * Per clarification Q1: strip only top-level `disclaimer` and `field_explanations`.
 */
function stripMetaKeys(data: unknown): unknown {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!STRIPPED_KEYS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

export class ValuerayClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ?? process.env.VALUERAY_BASE_URL ?? 'https://www.valueray.com/api/v1';
  }

  /**
   * Fetch a raw JSON response from the Valueray API.
   * Strips `disclaimer` and `field_explanations` top-level keys.
   * Throws typed errors for known HTTP error codes.
   *
   * @param path - API path including query string, e.g. `/symbolData?symbol=AAPL`
   */
  async fetchRaw(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();

      if (response.status === 404) {
        // Extract symbol from path for a helpful error message
        const symbolMatch = path.match(/symbol=([^&]+)/);
        const symbol = symbolMatch ? symbolMatch[1] : 'unknown';
        throw new AssetNotFoundError(symbol);
      }

      if (response.status === 429) {
        throw new RateLimitError();
      }

      throw new ValuerayApiError(response.status, path, body);
    }

    const data = await response.json();
    return stripMetaKeys(data);
  }
}
