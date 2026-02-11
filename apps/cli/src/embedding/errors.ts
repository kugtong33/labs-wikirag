/**
 * Custom error classes for embedding pipeline
 *
 * @module embedding/errors
 */

/**
 * Base error class for embedding-related errors
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EmbeddingError';

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when OpenAI API rate limit is exceeded
 */
export class RateLimitError extends EmbeddingError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    cause?: Error
  ) {
    super(message, 'rate_limit', cause);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when OpenAI API call fails
 */
export class OpenAIApiError extends EmbeddingError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: Error
  ) {
    super(message, 'openai_api', cause);
    this.name = 'OpenAIApiError';
  }
}

/**
 * Error thrown when Qdrant insertion fails
 */
export class QdrantInsertError extends EmbeddingError {
  constructor(
    message: string,
    public readonly batchSize?: number,
    cause?: Error
  ) {
    super(message, 'qdrant_insert', cause);
    this.name = 'QdrantInsertError';
  }
}

/**
 * Error thrown when batch processing fails
 */
export class BatchProcessingError extends EmbeddingError {
  constructor(
    message: string,
    public readonly failedCount: number,
    public readonly totalCount: number,
    cause?: Error
  ) {
    super(message, 'batch_processing', cause);
    this.name = 'BatchProcessingError';
  }
}
