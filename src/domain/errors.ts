// src/domain/errors.ts
// Domain error types for the Valueray MCP Server.
// All errors thrown by ValuerayClient propagate to MCP tools as isError responses.

export class ValuerayApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(`Valueray API error [${statusCode}] at ${endpoint}: ${message}`);
    this.name = 'ValuerayApiError';
  }
}

export class AssetNotFoundError extends Error {
  constructor(public readonly symbol: string) {
    super(`Asset not found: ${symbol}`);
    this.name = 'AssetNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Valueray API rate limit reached. Try again later.');
    this.name = 'RateLimitError';
  }
}
