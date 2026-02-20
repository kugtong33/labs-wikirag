/**
 * Ollama local LLM embedding provider implementation
 *
 * @module embeddings/providers/ollama
 */

import * as R from 'ramda';
import type { EmbeddingProvider } from '../provider.js';
import type {
  LocalLLMConfig,
  BatchEmbeddingResult,
  ModelInfo,
  ValidationResult,
} from '../types.js';

/**
 * Default Ollama server URL
 */
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  baseUrl: DEFAULT_OLLAMA_URL,
  batchSize: 50,
  maxRetries: 3,
  baseDelay: 1000,
} as const;

/**
 * Ollama-specific API error
 */
export class OllamaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OllamaApiError';
  }
}

/**
 * Shape of the Ollama /api/embed response
 */
interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

/**
 * Ollama embedding provider
 *
 * Implements the EmbeddingProvider interface against the Ollama local LLM
 * runtime. Uses the native /api/embed endpoint with batch input support.
 * No additional npm dependencies — native fetch() is used for HTTP calls.
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider({
 *   model: 'nomic-embed-text',
 *   baseUrl: 'http://localhost:11434',
 * });
 *
 * const embedding = await provider.embed('Hello world');
 * const batch = await provider.embedBatch(['text1', 'text2']);
 * ```
 */
export class OllamaProvider implements EmbeddingProvider {
  private config: Required<LocalLLMConfig>;
  private cachedDimensions: number | null = null;

  constructor(config: LocalLLMConfig) {
    this.config = R.mergeDeepRight(DEFAULT_CONFIG, config) as Required<LocalLLMConfig>;
  }

  /**
   * Generate embedding for a single text string
   */
  public async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    if (result.embeddings.length === 0) {
      throw new OllamaApiError(
        `Failed to generate embedding: ${result.errors[0] ?? 'Unknown error'}`
      );
    }
    return result.embeddings[0];
  }

  /**
   * Generate embeddings for a batch of text strings via Ollama /api/embed
   *
   * Sends all texts in a single request (Ollama supports native batch input).
   * Includes retry logic with exponential backoff for transient failures.
   */
  public async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (R.isEmpty(texts)) {
      return {
        embeddings: [],
        successIndices: [],
        failedIndices: [],
        errors: [],
        rateLimitHits: 0,
      };
    }

    try {
      const { response, rateLimitHits } = await this.withRetry(async () => {
        const res = await fetch(`${this.config.baseUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            input: texts,
          }),
        });

        if (!res.ok) {
          throw new OllamaApiError(
            `Ollama API error: ${res.status} ${res.statusText}`,
            res.status
          );
        }

        return res.json() as Promise<OllamaEmbedResponse>;
      });

      const embeddings = response.embeddings;

      // Cache dimensions from first successful response
      if (this.cachedDimensions === null && embeddings.length > 0) {
        this.cachedDimensions = embeddings[0].length;
      }

      const successIndices = R.range(0, embeddings.length);

      return {
        embeddings,
        successIndices,
        failedIndices: [],
        errors: [],
        rateLimitHits,
      };
    } catch (error) {
      const failedIndices = R.range(0, texts.length);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        embeddings: [],
        successIndices: [],
        failedIndices,
        errors: R.repeat(errorMessage, texts.length),
        rateLimitHits: 0,
      };
    }
  }

  /**
   * Get model information
   *
   * Dimensions are 0 until the first successful embedBatch call, after which
   * they are cached from the actual response.
   */
  public getModelInfo(): ModelInfo {
    return {
      provider: this.config.model,
      model: this.config.model,
      dimensions: this.cachedDimensions ?? 0,
      description: `Ollama local model: ${this.config.model}`,
    };
  }

  /**
   * Validate provider configuration
   *
   * Checks that model name is non-empty and baseUrl is a valid URL.
   * Does NOT make network calls.
   */
  public validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.config.model || this.config.model.trim() === '') {
      errors.push('Model name is required');
    }

    if (!this.config.baseUrl || this.config.baseUrl.trim() === '') {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(this.config.baseUrl);
      } catch {
        errors.push('Base URL must be a valid URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute a function with automatic retry and exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>
  ): Promise<{ response: T; rateLimitHits: number }> {
    let lastError: Error | null = null;
    const rateLimitHits = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fn();
        return { response, rateLimitHits };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          break;
        }

        const delay = this.applyJitter(this.config.baseDelay * Math.pow(2, attempt));
        console.warn(
          `Ollama API error, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries}): ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    throw new OllamaApiError(
      `Ollama API call failed after ${this.config.maxRetries} retries: ${lastError?.message}`,
      lastError instanceof OllamaApiError ? lastError.statusCode : undefined,
      lastError as Error
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private applyJitter(delay: number): number {
    const maxDelay = 60_000;
    const capped = Math.min(delay, maxDelay);
    const jitter = Math.floor(Math.random() * 250);
    return capped + jitter;
  }
}
