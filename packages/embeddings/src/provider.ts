/**
 * Embedding provider interface and base class
 *
 * @module embeddings/provider
 */

import type { ModelInfo, BatchEmbeddingResult, ValidationResult } from './types.js';

/**
 * Embedding provider interface
 *
 * All embedding providers must implement this interface to be compatible
 * with the WikiRAG embedding pipeline.
 *
 * @example
 * ```typescript
 * class MyProvider implements EmbeddingProvider {
 *   async embed(text: string): Promise<number[]> {
 *     // Implementation
 *   }
 *
 *   async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
 *     // Implementation
 *   }
 *
 *   getModelInfo(): ModelInfo {
 *     return {
 *       provider: 'my-provider',
 *       model: 'my-model',
 *       dimensions: 1536
 *     };
 *   }
 *
 *   validateConfig(): ValidationResult {
 *     return { valid: true, errors: [] };
 *   }
 * }
 * ```
 */
export interface EmbeddingProvider {
  /**
   * Generate embedding for a single text string
   *
   * @param text - Text to embed
   * @returns Embedding vector
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for a batch of text strings
   *
   * This method should implement batching for efficiency and include
   * retry logic for transient failures. Rate limiting should be handled
   * gracefully with exponential backoff.
   *
   * @param texts - Array of texts to embed
   * @returns Batch embedding result with embeddings and any failures
   */
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Get model information
   *
   * @returns Model metadata including provider name, model ID, and dimensions
   */
  getModelInfo(): ModelInfo;

  /**
   * Validate provider configuration
   *
   * This method should check that all required configuration is present
   * and valid (e.g., API keys exist, URLs are reachable, etc.)
   *
   * @returns Validation result with any error messages
   */
  validateConfig(): ValidationResult;
}
