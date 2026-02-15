/**
 * Tests for provider registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProviderRegistry,
  ProviderRegistryError,
  type ProviderFactory,
} from '../src/registry.js';
import type { EmbeddingProvider } from '../src/provider.js';
import type { ModelInfo, BatchEmbeddingResult, ValidationResult } from '../src/types.js';

/**
 * Mock provider for testing
 */
class MockProvider implements EmbeddingProvider {
  constructor(private config: { model: string }) {}

  async embed(text: string): Promise<number[]> {
    return new Array(128).fill(0);
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    return {
      embeddings: texts.map(() => new Array(128).fill(0)),
      successIndices: texts.map((_, i) => i),
      failedIndices: [],
      errors: [],
      rateLimitHits: 0,
    };
  }

  getModelInfo(): ModelInfo {
    return {
      provider: 'mock',
      model: this.config.model,
      dimensions: 128,
    };
  }

  validateConfig(): ValidationResult {
    return { valid: true, errors: [] };
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  const mockFactory: ProviderFactory = (config) => new MockProvider(config);
  const mockModelInfo: ModelInfo = {
    provider: 'mock',
    model: 'mock-model',
    dimensions: 128,
  };

  beforeEach(() => {
    ProviderRegistry.resetInstance();
    registry = ProviderRegistry.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ProviderRegistry.getInstance();
      const instance2 = ProviderRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = ProviderRegistry.getInstance();
      ProviderRegistry.resetInstance();
      const instance2 = ProviderRegistry.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a provider', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      expect(registry.hasProvider('mock')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('should throw error if provider already registered', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      expect(() =>
        registry.register({
          name: 'mock',
          factory: mockFactory,
          modelInfo: mockModelInfo,
        })
      ).toThrow(ProviderRegistryError);
    });
  });

  describe('unregister', () => {
    it('should unregister a provider', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      const result = registry.unregister('mock');
      expect(result).toBe(true);
      expect(registry.hasProvider('mock')).toBe(false);
    });

    it('should return false if provider not found', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('hasProvider', () => {
    it('should return true for registered provider', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      expect(registry.hasProvider('mock')).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      expect(registry.hasProvider('nonexistent')).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return provider instance', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      const provider = registry.getProvider('mock', { model: 'test-model' });
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it('should throw error if provider not found', () => {
      expect(() => registry.getProvider('nonexistent', {})).toThrow(
        ProviderRegistryError
      );
    });

    it('should include available providers in error message', () => {
      registry.register({
        name: 'provider1',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      registry.register({
        name: 'provider2',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      try {
        registry.getProvider('nonexistent', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderRegistryError);
        if (error instanceof Error) {
          expect(error.message).toContain('provider1, provider2');
        }
      }
    });
  });

  describe('getModelInfo', () => {
    it('should return model info for provider', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      const info = registry.getModelInfo('mock');
      expect(info).toEqual(mockModelInfo);
    });

    it('should return a clone of model info', () => {
      registry.register({
        name: 'mock',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      const info = registry.getModelInfo('mock');
      expect(info).not.toBe(mockModelInfo);
      expect(info).toEqual(mockModelInfo);
    });

    it('should throw error if provider not found', () => {
      expect(() => registry.getModelInfo('nonexistent')).toThrow(
        ProviderRegistryError
      );
    });
  });

  describe('getProviderNames', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.getProviderNames()).toEqual([]);
    });

    it('should return sorted list of provider names', () => {
      registry.register({
        name: 'zebra',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      registry.register({
        name: 'alpha',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      registry.register({
        name: 'beta',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      expect(registry.getProviderNames()).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('listProviders', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it('should return sorted list of providers with model info', () => {
      registry.register({
        name: 'provider2',
        factory: mockFactory,
        modelInfo: { ...mockModelInfo, provider: 'provider2' },
      });
      registry.register({
        name: 'provider1',
        factory: mockFactory,
        modelInfo: { ...mockModelInfo, provider: 'provider1' },
      });

      const providers = registry.listProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe('provider1');
      expect(providers[1].name).toBe('provider2');
      expect(providers[0].modelInfo.provider).toBe('provider1');
      expect(providers[1].modelInfo.provider).toBe('provider2');
    });
  });

  describe('clear', () => {
    it('should remove all providers', () => {
      registry.register({
        name: 'provider1',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      registry.register({
        name: 'provider2',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });

      expect(registry.size()).toBe(2);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 when no providers registered', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct count of registered providers', () => {
      registry.register({
        name: 'provider1',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      expect(registry.size()).toBe(1);

      registry.register({
        name: 'provider2',
        factory: mockFactory,
        modelInfo: mockModelInfo,
      });
      expect(registry.size()).toBe(2);
    });
  });
});
