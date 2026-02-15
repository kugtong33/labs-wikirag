/**
 * Embedding providers package
 *
 * Provides a pluggable architecture for embedding generation with support
 * for multiple embedding providers (OpenAI, local LLMs, etc.)
 *
 * @module embeddings
 */

// Core interfaces and types
export type { EmbeddingProvider } from './provider.js';
export type {
  ModelInfo,
  ProviderConfig,
  OpenAIConfig,
  LocalLLMConfig,
  BatchEmbeddingResult,
  ValidationResult,
} from './types.js';

// Provider registry
export {
  ProviderRegistry,
  providerRegistry,
  ProviderRegistryError,
  type ProviderFactory,
} from './registry.js';

// OpenAI provider
export {
  OpenAIProvider,
  OpenAIApiError,
  RateLimitError,
} from './providers/openai.js';

// Auto-register OpenAI provider
import { providerRegistry } from './registry.js';
import { OpenAIProvider } from './providers/openai.js';
import type { OpenAIConfig } from './types.js';

providerRegistry.register({
  name: 'openai',
  factory: (config: unknown) => new OpenAIProvider(config as OpenAIConfig),
  modelInfo: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    description: 'OpenAI text-embedding-3-small model',
  },
});
