/**
 * OpenAI embedding provider implementation
 *
 * @module embeddings/providers/openai
 */

import OpenAI from 'openai';
import * as R from 'ramda';
import type { EmbeddingProvider } from '../provider.js';
import type {
  OpenAIConfig,
  BatchEmbeddingResult,
  ModelInfo,
  ValidationResult,
} from '../types.js';

/**
 * Default OpenAI embedding model
 */
const DEFAULT_MODEL = 'text-embedding-3-small';

/**
 * Model dimensions mapping
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  model: DEFAULT_MODEL,
  batchSize: 100,
  maxRetries: 3,
  baseDelay: 1000,
} as const;

/**
 * OpenAI-specific errors
 */
export class OpenAIApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OpenAIApiError';
  }
}

export class RateLimitError extends OpenAIApiError {
  constructor(
    message: string,
    public retryAfter?: number,
    originalError?: Error
  ) {
    super(message, 429, originalError);
    this.name = 'RateLimitError';
  }
}

/**
 * OpenAI embedding provider
 *
 * Implements the EmbeddingProvider interface for OpenAI's embedding API.
 * Provides automatic retry logic, rate limiting, and exponential backoff.
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'text-embedding-3-small',
 *   maxRetries: 3
 * });
 *
 * const embedding = await provider.embed('Hello world');
 * const batch = await provider.embedBatch(['text1', 'text2']);
 * ```
 */
export class OpenAIProvider implements EmbeddingProvider {
  private client: OpenAI;
  private config: Required<OpenAIConfig>;

  constructor(config: OpenAIConfig) {
    this.config = R.mergeDeepRight(DEFAULT_CONFIG, config) as Required<OpenAIConfig>;
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organizationId,
    });
  }

  /**
   * Generate embedding for a single text string
   *
   * @param text - Text to embed
   * @returns Embedding vector
   */
  public async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    if (result.embeddings.length === 0) {
      throw new OpenAIApiError(
        `Failed to generate embedding: ${result.errors[0] || 'Unknown error'}`
      );
    }
    return result.embeddings[0];
  }

  /**
   * Generate embeddings for a batch of text strings
   *
   * Implements automatic retry with exponential backoff for transient failures.
   * Rate limit errors (429) trigger longer delays based on Retry-After header.
   *
   * @param texts - Array of text strings to embed
   * @returns Batch embedding result with embeddings and any failures
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
      const { response, rateLimitHits } = await this.withRetry(() =>
        this.client.embeddings.create({
          model: this.config.model,
          input: texts,
          encoding_format: 'float',
        })
      );

      // Extract embeddings in order
      const sorted = R.sortBy<{ embedding: number[]; index: number }>(
        R.prop('index'),
        response.data as Array<{ embedding: number[]; index: number }>
      );
      const embeddings = R.pluck('embedding', sorted) as number[][];
      const successIndices = R.pluck('index', sorted) as number[];

      return {
        embeddings,
        successIndices,
        failedIndices: [],
        errors: [],
        rateLimitHits,
      };
    } catch (error) {
      // If entire batch fails, return error for all items
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
   * @returns Model metadata
   */
  public getModelInfo(): ModelInfo {
    const dimensions = MODEL_DIMENSIONS[this.config.model] || 1536;
    return {
      provider: 'openai',
      model: this.config.model,
      dimensions,
      description: `OpenAI embedding model ${this.config.model}`,
    };
  }

  /**
   * Validate provider configuration
   *
   * @returns Validation result
   */
  public validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      errors.push('OpenAI API key is required');
    }

    if (!this.config.model || this.config.model.trim() === '') {
      errors.push('Model name is required');
    }

    if (this.config.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (this.config.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }

    if (this.config.baseDelay <= 0) {
      errors.push('Base delay must be greater than 0');
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
    let rateLimitHits = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fn();
        return { response, rateLimitHits };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if this is a rate limit error
        const isRateLimit = this.isRateLimitError(error);
        const retryAfter = this.extractRetryAfter(error);

        if (isRateLimit) {
          rateLimitHits += 1;
          const baseDelay = retryAfter
            ? retryAfter * 1000
            : this.config.baseDelay * Math.pow(2, attempt);
          const delay = this.applyJitter(baseDelay);

          console.warn(
            `Rate limit hit, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`
          );

          await this.sleep(delay);
          continue;
        }

        // For other errors, use exponential backoff
        const delay = this.applyJitter(this.config.baseDelay * Math.pow(2, attempt));
        console.warn(
          `API error, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries}): ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    if (this.isRateLimitError(lastError)) {
      throw new RateLimitError(
        `Rate limit exceeded after ${this.config.maxRetries} retries`,
        this.extractRetryAfter(lastError),
        lastError as Error
      );
    }

    throw new OpenAIApiError(
      `OpenAI API call failed after ${this.config.maxRetries} retries: ${lastError?.message}`,
      this.extractStatusCode(lastError),
      lastError as Error
    );
  }

  /**
   * Check if an error is a rate limit error (HTTP 429)
   */
  private isRateLimitError(error: unknown): boolean {
    return R.pipe(R.pathOr(0, ['status']), R.equals(429))(error);
  }

  /**
   * Extract Retry-After header value from error
   */
  private extractRetryAfter(error: unknown): number | undefined {
    return R.pipe(
      R.pathOr<string | undefined>(undefined, ['headers', 'retry-after']),
      R.when(R.is(String), (val: string) => parseInt(val, 10))
    )(error) as number | undefined;
  }

  /**
   * Extract HTTP status code from error
   */
  private extractStatusCode(error: unknown): number | undefined {
    return R.pathOr(undefined, ['status'], error);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Apply jitter and cap to backoff delays
   */
  private applyJitter(delay: number): number {
    const maxDelay = 60_000;
    const capped = Math.min(delay, maxDelay);
    const jitter = Math.floor(Math.random() * 250);
    return capped + jitter;
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<OpenAIConfig> {
    return R.clone(this.config);
  }
}
