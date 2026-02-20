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

// Ollama provider and health utilities
export {
  OllamaProvider,
  OllamaApiError,
  DEFAULT_OLLAMA_URL,
} from './providers/ollama.js';
export {
  checkOllamaConnection,
  listAvailableModels,
} from './providers/ollama-health.js';

// Auto-register OpenAI provider
import { providerRegistry } from './registry.js';
import { OpenAIProvider } from './providers/openai.js';
import { OllamaProvider } from './providers/ollama.js';
import type { OpenAIConfig, LocalLLMConfig } from './types.js';

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

// Auto-register nomic-embed-text (Ollama)
providerRegistry.register({
  name: 'nomic-embed-text',
  factory: (config: unknown) =>
    new OllamaProvider({ model: 'nomic-embed-text', ...(config as Partial<LocalLLMConfig>) }),
  modelInfo: {
    provider: 'nomic-embed-text',
    model: 'nomic-embed-text',
    dimensions: 768,
    description: 'Ollama nomic-embed-text — 768 dims, outperforms OpenAI ada-002',
  },
});

// Auto-register qwen3-embedding (Ollama)
providerRegistry.register({
  name: 'qwen3-embedding',
  factory: (config: unknown) =>
    new OllamaProvider({ model: 'qwen3-embedding', ...(config as Partial<LocalLLMConfig>) }),
  modelInfo: {
    provider: 'qwen3-embedding',
    model: 'qwen3-embedding',
    dimensions: 1024,
    description: 'Ollama qwen3-embedding — up to 4096 dims, #1 MTEB multilingual',
  },
});
