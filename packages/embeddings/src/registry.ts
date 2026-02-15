/**
 * Provider registry for embedding providers
 *
 * @module embeddings/registry
 */

import * as R from 'ramda';
import type { EmbeddingProvider } from './provider.js';
import type { ModelInfo } from './types.js';

/**
 * Provider factory function type
 */
export type ProviderFactory<T = unknown> = (config: T) => EmbeddingProvider;

/**
 * Registered provider metadata
 */
interface RegisteredProvider {
  /** Provider name */
  name: string;
  /** Factory function to create provider instance */
  factory: ProviderFactory;
  /** Model information */
  modelInfo: ModelInfo;
}

/**
 * Provider registry errors
 */
export class ProviderRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderRegistryError';
  }
}

/**
 * Provider registry for managing embedding providers
 *
 * This registry allows providers to be registered, discovered, and instantiated
 * at runtime. It implements a plugin-style architecture where new providers can
 * be added without modifying core code.
 *
 * @example
 * ```typescript
 * // Register a provider
 * providerRegistry.register({
 *   name: 'openai',
 *   factory: (config) => new OpenAIProvider(config),
 *   modelInfo: {
 *     provider: 'openai',
 *     model: 'text-embedding-3-small',
 *     dimensions: 1536
 *   }
 * });
 *
 * // Get provider instance
 * const provider = providerRegistry.getProvider('openai', config);
 *
 * // List all providers
 * const providers = providerRegistry.listProviders();
 * ```
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, RegisteredProvider> = new Map();

  private constructor() {}

  /**
   * Get singleton instance of the registry
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ProviderRegistry.instance = null;
  }

  /**
   * Register a new embedding provider
   *
   * @param provider - Provider metadata including name, factory, and model info
   * @throws {ProviderRegistryError} If provider name already exists
   */
  public register(provider: RegisteredProvider): void {
    if (this.providers.has(provider.name)) {
      throw new ProviderRegistryError(
        `Provider "${provider.name}" is already registered`
      );
    }

    this.providers.set(provider.name, provider);
  }

  /**
   * Unregister a provider
   *
   * @param name - Provider name to unregister
   * @returns True if provider was unregistered, false if not found
   */
  public unregister(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Check if a provider is registered
   *
   * @param name - Provider name to check
   * @returns True if provider is registered
   */
  public hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get a provider instance
   *
   * @param name - Provider name
   * @param config - Provider configuration
   * @returns Provider instance
   * @throws {ProviderRegistryError} If provider not found
   */
  public getProvider<T = unknown>(name: string, config: T): EmbeddingProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderRegistryError(
        `Provider "${name}" not found. Available providers: ${this.getProviderNames().join(', ')}`
      );
    }

    return provider.factory(config);
  }

  /**
   * Get model information for a provider
   *
   * @param name - Provider name
   * @returns Model information
   * @throws {ProviderRegistryError} If provider not found
   */
  public getModelInfo(name: string): ModelInfo {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderRegistryError(`Provider "${name}" not found`);
    }

    return R.clone(provider.modelInfo);
  }

  /**
   * List all registered provider names
   *
   * @returns Array of provider names
   */
  public getProviderNames(): string[] {
    return Array.from(this.providers.keys()).sort();
  }

  /**
   * List all registered providers with their model information
   *
   * @returns Array of provider metadata
   */
  public listProviders(): Array<{ name: string; modelInfo: ModelInfo }> {
    return R.pipe(
      () => Array.from(this.providers.entries()),
      R.map(([name, provider]) => ({
        name,
        modelInfo: R.clone(provider.modelInfo),
      })),
      R.sortBy(R.prop('name'))
    )();
  }

  /**
   * Clear all registered providers (useful for testing)
   */
  public clear(): void {
    this.providers.clear();
  }

  /**
   * Get total number of registered providers
   */
  public size(): number {
    return this.providers.size;
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = ProviderRegistry.getInstance();
