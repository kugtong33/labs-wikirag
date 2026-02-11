/**
 * OpenAI client wrapper for generating text embeddings
 *
 * Provides embedding generation with automatic retry logic,
 * rate limiting, and exponential backoff.
 *
 * @module embedding/openai-client
 */

import OpenAI from 'openai';
import * as R from 'ramda';
import type { EmbeddingConfig, BatchEmbeddingResult } from './types';
import { OpenAIApiError, RateLimitError } from './errors';

/**
 * Default embedding model
 */
const DEFAULT_MODEL = 'text-embedding-3-small';

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
 * OpenAI client wrapper for generating embeddings
 *
 * This client:
 * - Manages OpenAI API connection
 * - Generates embeddings for text batches
 * - Implements exponential backoff retry logic
 * - Handles rate limiting gracefully
 *
 * @example
 * ```typescript
 * const client = OpenAIClient.getInstance({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'text-embedding-3-small',
 *   maxRetries: 3
 * });
 *
 * const result = await client.generateEmbeddings(['text1', 'text2']);
 * ```
 */
export class OpenAIClient {
  private static instance: OpenAIClient | null = null;
  private client: OpenAI;
  private config: Required<EmbeddingConfig>;

  private constructor(config: EmbeddingConfig) {
    this.config = R.mergeRight(DEFAULT_CONFIG, config) as Required<EmbeddingConfig>;
    this.client = new OpenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Get or create singleton instance of OpenAI client
   *
   * @param config - Configuration for the client
   * @returns OpenAI client instance
   */
  public static getInstance(config: EmbeddingConfig): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient(config);
    }
    return OpenAIClient.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    OpenAIClient.instance = null;
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
  public async generateEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (R.isEmpty(texts)) {
      return {
        embeddings: [],
        failedIndices: [],
        errors: [],
      };
    }

    try {
      const response = await this.withRetry(() =>
        this.client.embeddings.create({
          model: this.config.model,
          input: texts,
          encoding_format: 'float',
        })
      );

      // Extract embeddings in order, using Ramda for transformation
      const sorted = R.sortBy<{ embedding: number[]; index: number }>(
        R.prop('index'),
        response.data as Array<{ embedding: number[]; index: number }>
      );
      const embeddings = R.pluck('embedding', sorted) as number[][];

      return {
        embeddings,
        failedIndices: [],
        errors: [],
      };
    } catch (error) {
      // If entire batch fails, return error for all items
      const failedIndices = R.range(0, texts.length);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        embeddings: [],
        failedIndices,
        errors: R.repeat(errorMessage, texts.length),
      };
    }
  }

  /**
   * Execute a function with automatic retry and exponential backoff
   *
   * Retry logic:
   * - Initial delay: baseDelay (default: 1000ms)
   * - Subsequent delays: baseDelay * 2^attempt (exponential backoff)
   * - Rate limit errors: respect Retry-After header if provided
   * - Max retries: configurable (default: 3)
   *
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws {RateLimitError} If rate limit exceeded after max retries
   * @throws {OpenAIApiError} If API call fails after max retries
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
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
          // Use Retry-After header if available, otherwise exponential backoff
          const delay = retryAfter
            ? retryAfter * 1000
            : this.config.baseDelay * Math.pow(2, attempt);

          console.warn(
            `Rate limit hit, retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`
          );

          await this.sleep(delay);
          continue;
        }

        // For other errors, use exponential backoff
        const delay = this.config.baseDelay * Math.pow(2, attempt);
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
   *
   * @param error - Error to check
   * @returns True if rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    return R.pipe(
      R.pathOr(0, ['status']),
      R.equals(429)
    )(error);
  }

  /**
   * Extract Retry-After header value from error
   *
   * @param error - Error to extract from
   * @returns Retry-After value in seconds, or undefined
   */
  private extractRetryAfter(error: unknown): number | undefined {
    return R.pipe(
      R.pathOr<string | undefined>(undefined, ['headers', 'retry-after']),
      R.when(R.is(String), (val: string) => parseInt(val, 10))
    )(error) as number | undefined;
  }

  /**
   * Extract HTTP status code from error
   *
   * @param error - Error to extract from
   * @returns HTTP status code, or undefined
   */
  private extractStatusCode(error: unknown): number | undefined {
    return R.pathOr(undefined, ['status'], error);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   *
   * @returns Current client configuration
   */
  public getConfig(): Required<EmbeddingConfig> {
    return R.clone(this.config);
  }
}
