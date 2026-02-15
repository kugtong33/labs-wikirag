/**
 * Tests for OpenAI embedding provider
 */

import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../../src/providers/openai.js';
import type { OpenAIConfig } from '../../src/types.js';

describe('OpenAIProvider', () => {
  const validConfig: OpenAIConfig = {
    apiKey: 'test-api-key',
    model: 'text-embedding-3-small',
    batchSize: 10,
    maxRetries: 1,
    baseDelay: 100,
  };

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      const provider = new OpenAIProvider(validConfig);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should use default values for optional config', () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const config = provider.getConfig();
      expect(config.model).toBe('text-embedding-3-small');
      expect(config.batchSize).toBe(100);
      expect(config.maxRetries).toBe(3);
      expect(config.baseDelay).toBe(1000);
    });
  });

  describe('getModelInfo', () => {
    it('should return correct model info for text-embedding-3-small', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'text-embedding-3-small',
      });
      const info = provider.getModelInfo();

      expect(info.provider).toBe('openai');
      expect(info.model).toBe('text-embedding-3-small');
      expect(info.dimensions).toBe(1536);
    });

    it('should return correct dimensions for text-embedding-3-large', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'text-embedding-3-large',
      });
      const info = provider.getModelInfo();

      expect(info.dimensions).toBe(3072);
    });

    it('should return default dimensions for unknown model', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'unknown-model',
      });
      const info = provider.getModelInfo();

      expect(info.dimensions).toBe(1536);
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const provider = new OpenAIProvider(validConfig);
      const result = provider.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for missing API key', () => {
      const provider = new OpenAIProvider({ apiKey: '' });
      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required');
    });

    it('should return invalid for empty model', () => {
      const provider = new OpenAIProvider({ apiKey: 'test-key', model: '' });
      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });

    it('should return invalid for zero batch size', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        batchSize: 0,
      });
      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Batch size must be greater than 0');
    });

    it('should return invalid for negative max retries', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        maxRetries: -1,
      });
      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Max retries cannot be negative');
    });

    it('should return multiple errors for invalid config', () => {
      const provider = new OpenAIProvider({
        apiKey: '',
        model: '',
        batchSize: 0,
      });
      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('embedBatch', () => {
    it('should return empty result for empty input', async () => {
      const provider = new OpenAIProvider(validConfig);
      const result = await provider.embedBatch([]);

      expect(result.embeddings).toHaveLength(0);
      expect(result.successIndices).toHaveLength(0);
      expect(result.failedIndices).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getConfig', () => {
    it('should return a clone of config', () => {
      const provider = new OpenAIProvider(validConfig);
      const config1 = provider.getConfig();
      const config2 = provider.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
