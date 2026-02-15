/**
 * Type definitions for embedding providers
 *
 * @module embeddings/types
 */

/**
 * Model information for an embedding provider
 */
export interface ModelInfo {
  /** Provider name (e.g., 'openai', 'gpt-oss-14b', 'qwen3-14b') */
  provider: string;
  /** Model identifier (e.g., 'text-embedding-3-small', 'gpt-oss:14b') */
  model: string;
  /** Vector dimensions produced by this model */
  dimensions: number;
  /** Optional model version or variant */
  version?: string;
  /** Optional model description */
  description?: string;
}

/**
 * Base configuration for all embedding providers
 */
export interface ProviderConfig {
  /** Model to use for embeddings */
  model?: string;
  /** Batch size for embedding requests (default varies by provider) */
  batchSize?: number;
  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
}

/**
 * Configuration for OpenAI embedding provider
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** OpenAI organization ID (optional) */
  organizationId?: string;
}

/**
 * Configuration for local LLM embedding providers (Ollama-based)
 */
export interface LocalLLMConfig extends ProviderConfig {
  /** Base URL for the local LLM server (default: http://localhost:11434) */
  baseUrl?: string;
  /** Model name (e.g., 'gpt-oss:14b', 'qwen3:14b') */
  model: string;
}

/**
 * Result of a batch embedding operation
 */
export interface BatchEmbeddingResult {
  /** Successfully generated embeddings */
  embeddings: number[][];
  /** Indices of successful items in the original batch */
  successIndices: number[];
  /** Indices of failed items in the batch */
  failedIndices: number[];
  /** Error messages for failed items */
  errors: string[];
  /** Number of rate limit hits encountered */
  rateLimitHits: number;
}

/**
 * Validation result for provider configuration
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Error messages if invalid */
  errors: string[];
}
