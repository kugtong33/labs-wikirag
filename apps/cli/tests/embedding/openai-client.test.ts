/**
 * Tests for OpenAI client wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIClient } from '../../src/embedding/openai-client';
import type { EmbeddingConfig } from '../../src/embedding/types';

// Create mock create function
const mockCreate = vi.fn();

// Mock OpenAI module with a class
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockCreate,
      };
    },
  };
});

describe('OpenAIClient', () => {
  let config: EmbeddingConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      batchSize: 100,
      maxRetries: 3,
      baseDelay: 100, // Shorter delay for tests
    };

    // Reset singleton
    OpenAIClient.resetInstance();

    // Reset mock
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    OpenAIClient.resetInstance();
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = OpenAIClient.getInstance(config);
      const instance2 = OpenAIClient.getInstance(config);

      expect(instance1).toBe(instance2);
    });

    it('should merge config with defaults', () => {
      const minimalConfig: EmbeddingConfig = {
        apiKey: 'test-key',
      };

      const instance = OpenAIClient.getInstance(minimalConfig);
      const instanceConfig = instance.getConfig();

      expect(instanceConfig.model).toBe('text-embedding-3-small');
      expect(instanceConfig.batchSize).toBe(100);
      expect(instanceConfig.maxRetries).toBe(3);
      expect(instanceConfig.baseDelay).toBe(1000);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for a batch of texts', async () => {
      mockCreate.mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2, 0.3], index: 0 },
          { embedding: [0.4, 0.5, 0.6], index: 1 },
        ],
      });

      const client = OpenAIClient.getInstance(config);
      const texts = ['text1', 'text2'];

      const result = await client.generateEmbeddings(texts);

      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1]).toEqual([0.4, 0.5, 0.6]);
      expect(result.failedIndices).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });
    });

    it('should handle empty input', async () => {
      const client = OpenAIClient.getInstance(config);
      const result = await client.generateEmbeddings([]);

      expect(result.embeddings).toHaveLength(0);
      expect(result.failedIndices).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // Should not call API for empty input
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle out-of-order embeddings', async () => {
      mockCreate.mockResolvedValue({
        data: [
          { embedding: [0.4, 0.5, 0.6], index: 1 },
          { embedding: [0.1, 0.2, 0.3], index: 0 },
          { embedding: [0.7, 0.8, 0.9], index: 2 },
        ],
      });

      const client = OpenAIClient.getInstance(config);
      const texts = ['text1', 'text2', 'text3'];

      const result = await client.generateEmbeddings(texts);

      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1]).toEqual([0.4, 0.5, 0.6]);
      expect(result.embeddings[2]).toEqual([0.7, 0.8, 0.9]);
    });

    it('should retry on transient errors', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        });

      const client = OpenAIClient.getInstance(config);
      const result = await client.generateEmbeddings(['text1']);

      expect(result.embeddings).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit errors with retry', async () => {
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      rateLimitError.headers = { 'retry-after': '1' };

      mockCreate.mockRejectedValueOnce(rateLimitError).mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
      });

      const client = OpenAIClient.getInstance(config);
      const result = await client.generateEmbeddings(['text1']);

      expect(result.embeddings).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should return errors for entire batch on complete failure', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const client = OpenAIClient.getInstance(config);
      const texts = ['text1', 'text2'];

      const result = await client.generateEmbeddings(texts);

      expect(result.embeddings).toHaveLength(0);
      expect(result.failedIndices).toEqual([0, 1]);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('API error');
    });
  });

  describe('retry logic', () => {
    it('should exhaust retries on persistent rate limit', async () => {
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;

      mockCreate.mockRejectedValue(rateLimitError);

      const client = OpenAIClient.getInstance(config);
      const result = await client.generateEmbeddings(['text1']);

      expect(result.failedIndices).toEqual([0]);
      expect(mockCreate).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should use exponential backoff for retries', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        });

      const client = OpenAIClient.getInstance({
        ...config,
        baseDelay: 10, // Very short for testing
      });

      const startTime = Date.now();
      await client.generateEmbeddings(['text1']);
      const elapsed = Date.now() - startTime;

      // Should have delays: 10ms + 20ms = 30ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(25);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});
