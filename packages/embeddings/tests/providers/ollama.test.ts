/**
 * Tests for Ollama embedding provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider, OllamaApiError } from '../../src/providers/ollama.js';

// Helper to create a mock successful fetch response
const mockSuccess = (embeddings: number[][]) => ({
  ok: true,
  status: 200,
  json: () =>
    Promise.resolve({
      model: 'nomic-embed-text',
      embeddings,
    }),
});

// Helper to create a mock error fetch response
const mockHttpError = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: () => Promise.resolve({ error: statusText }),
});

describe('OllamaProvider', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ //
  // constructor                                                          //
  // ------------------------------------------------------------------ //

  describe('constructor', () => {
    it('should create provider with minimal config (model only)', () => {
      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it('should accept custom baseUrl and model', () => {
      const provider = new OllamaProvider({
        model: 'qwen3-embedding',
        baseUrl: 'http://remote-host:11434',
      });
      // validateConfig succeeds → baseUrl was accepted
      const result = provider.validateConfig();
      expect(result.valid).toBe(true);
    });
  });

  // ------------------------------------------------------------------ //
  // getModelInfo                                                         //
  // ------------------------------------------------------------------ //

  describe('getModelInfo', () => {
    it('should return provider name matching the model name', () => {
      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      const info = provider.getModelInfo();
      expect(info.provider).toBe('nomic-embed-text');
      expect(info.model).toBe('nomic-embed-text');
    });

    it('should return 0 dimensions before any embed call', () => {
      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      const info = provider.getModelInfo();
      expect(info.dimensions).toBe(0);
    });
  });

  // ------------------------------------------------------------------ //
  // validateConfig                                                       //
  // ------------------------------------------------------------------ //

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const provider = new OllamaProvider({
        model: 'nomic-embed-text',
        baseUrl: 'http://localhost:11434',
      });
      const result = provider.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for empty model name', () => {
      const provider = new OllamaProvider({ model: '' });
      const result = provider.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });

    it('should return invalid for whitespace-only model name', () => {
      const provider = new OllamaProvider({ model: '   ' });
      const result = provider.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });
  });

  // ------------------------------------------------------------------ //
  // embedBatch                                                           //
  // ------------------------------------------------------------------ //

  describe('embedBatch', () => {
    it('should return empty result for empty input without calling fetch', async () => {
      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      const result = await provider.embedBatch([]);

      expect(result.embeddings).toHaveLength(0);
      expect(result.successIndices).toHaveLength(0);
      expect(result.failedIndices).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.rateLimitHits).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call the correct Ollama /api/embed endpoint', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccess([[0.1, 0.2, 0.3]]));

      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      await provider.embedBatch(['hello world']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embed',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'nomic-embed-text', input: ['hello world'] }),
        })
      );
    });

    it('should return embeddings and successIndices for successful response', async () => {
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      mockFetch.mockResolvedValueOnce(mockSuccess(embeddings));

      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      const result = await provider.embedBatch(['text1', 'text2']);

      expect(result.embeddings).toEqual(embeddings);
      expect(result.successIndices).toEqual([0, 1]);
      expect(result.failedIndices).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle API error responses by returning failures', async () => {
      mockFetch.mockResolvedValueOnce(mockHttpError(500, 'Internal Server Error'));

      const provider = new OllamaProvider({ model: 'nomic-embed-text', maxRetries: 0 });
      const result = await provider.embedBatch(['hello']);

      expect(result.embeddings).toHaveLength(0);
      expect(result.failedIndices).toEqual([0]);
      expect(result.errors).toHaveLength(1);
    });

    it('should fallback to per-item embedding on batch 400 errors', async () => {
      mockFetch
        // Initial batch call fails with 400
        .mockResolvedValueOnce(mockHttpError(400, 'Bad Request'))
        // Fallback item 0 succeeds
        .mockResolvedValueOnce(mockSuccess([[0.1, 0.2, 0.3]]))
        // Fallback item 1 fails
        .mockResolvedValueOnce(mockHttpError(400, 'Bad Request'));

      const provider = new OllamaProvider({ model: 'nomic-embed-text', maxRetries: 0 });
      const result = await provider.embedBatch(['ok text', 'bad text']);

      expect(result.embeddings).toHaveLength(1);
      expect(result.successIndices).toEqual([0]);
      expect(result.failedIndices).toEqual([1]);
      expect(result.errors[1]).toContain('400 Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should cache dimensions from first successful response', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccess([[0.1, 0.2, 0.3, 0.4, 0.5]]));

      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      await provider.embedBatch(['hello']);

      const info = provider.getModelInfo();
      expect(info.dimensions).toBe(5);
    });

    it('should retry on transient failures and succeed on retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSuccess([[0.1, 0.2]]));

      const provider = new OllamaProvider({
        model: 'nomic-embed-text',
        maxRetries: 1,
        baseDelay: 1,
      });
      const result = await provider.embedBatch(['hello']);

      expect(result.embeddings).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return all failed indices when retries are exhausted', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      const provider = new OllamaProvider({
        model: 'nomic-embed-text',
        maxRetries: 0,
      });
      const result = await provider.embedBatch(['a', 'b', 'c']);

      expect(result.embeddings).toHaveLength(0);
      expect(result.failedIndices).toEqual([0, 1, 2]);
      expect(result.errors).toHaveLength(3);
    });
  });

  // ------------------------------------------------------------------ //
  // embed                                                                //
  // ------------------------------------------------------------------ //

  describe('embed', () => {
    it('should delegate to embedBatch and return single embedding vector', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccess([[0.1, 0.2, 0.3]]));

      const provider = new OllamaProvider({ model: 'nomic-embed-text' });
      const result = await provider.embed('hello');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw OllamaApiError when embedBatch returns no embeddings', async () => {
      mockFetch.mockResolvedValueOnce(mockHttpError(503, 'Service Unavailable'));

      const provider = new OllamaProvider({ model: 'nomic-embed-text', maxRetries: 0 });

      await expect(provider.embed('hello')).rejects.toThrow(OllamaApiError);
    });
  });
});
