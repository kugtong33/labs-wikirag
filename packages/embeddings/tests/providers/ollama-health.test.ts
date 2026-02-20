/**
 * Tests for Ollama health check utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkOllamaConnection,
  listAvailableModels,
} from '../../src/providers/ollama-health.js';

describe('checkOllamaConnection', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when Ollama server is reachable and returns ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await checkOllamaConnection('http://localhost:11434');

    expect(result).toBe(true);
  });

  it('should return false when server is unreachable (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await checkOllamaConnection('http://localhost:11434');

    expect(result).toBe(false);
  });

  it('should return false when server responds with non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await checkOllamaConnection('http://localhost:11434');

    expect(result).toBe(false);
  });

  it('should return false when request is aborted (timeout)', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await checkOllamaConnection('http://localhost:11434', 100);

    expect(result).toBe(false);
  });
});

describe('listAvailableModels', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return model names from a valid Ollama tags response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          models: [
            { name: 'nomic-embed-text:latest', size: 274000000 },
            { name: 'qwen3-embedding:latest', size: 639000000 },
          ],
        }),
    });

    const models = await listAvailableModels('http://localhost:11434');

    expect(models).toEqual(['nomic-embed-text:latest', 'qwen3-embedding:latest']);
  });

  it('should throw when server responds with error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(listAvailableModels('http://localhost:11434')).rejects.toThrow(
      'Failed to list models'
    );
  });

  it('should throw with timeout message when request is aborted', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(listAvailableModels('http://localhost:11434', 100)).rejects.toThrow(
      /timed out/i
    );
  });
});
