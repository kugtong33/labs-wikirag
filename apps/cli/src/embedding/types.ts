/**
 * Type definitions for embedding generation and Qdrant insertion
 *
 * @module embedding/types
 */

/**
 * Represents a Wikipedia paragraph ready for embedding
 */
export interface ParsedParagraph {
  content: string;
  articleTitle: string;
  articleId: string;
  sectionName: string;
  paragraphPosition: number;
}

/**
 * Represents a vector with its metadata payload for Qdrant insertion
 */
export interface EmbeddedParagraph {
  vector: number[];
  payload: WikipediaPayload;
}

/**
 * Metadata payload schema for Qdrant points
 */
export interface WikipediaPayload {
  articleTitle: string;
  articleId: string;
  sectionName: string;
  paragraphPosition: number;
  dumpVersion: string;
  embeddingModel: string;
}

/**
 * Configuration for OpenAI embedding generation
 */
export interface EmbeddingConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Embedding model to use (default: text-embedding-3-small) */
  model?: string;
  /** Batch size for embedding API calls (default: 100) */
  batchSize?: number;
  /** Maximum retries for failed API calls (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
}

/**
 * Configuration for Qdrant insertion
 */
export interface QdrantInsertConfig {
  /** Qdrant collection name */
  collectionName: string;
  /** Batch size for Qdrant insertions (default: 100) */
  batchSize?: number;
}

/**
 * Progress metrics for embedding pipeline
 */
export interface EmbeddingMetrics {
  /** Total paragraphs processed */
  paragraphsProcessed: number;
  /** Total embeddings generated */
  embeddingsGenerated: number;
  /** Total API calls made to OpenAI */
  apiCallsMade: number;
  /** Total errors encountered */
  errors: number;
  /** Number of times rate limit was hit */
  rateLimitHits: number;
  /** Pipeline start time (unix timestamp) */
  startTime: number;
  /** Estimated time remaining in ms */
  estimatedTimeRemaining?: number;
  /** Optional total expected paragraph count */
  totalExpectedParagraphs?: number;
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
 * Configuration for embedding pipeline
 */
export interface PipelineConfig {
  /** Wikipedia dump version (YYYYMMDD format) */
  dumpVersion: string;
  /** Embedding strategy (e.g., 'paragraph', 'chunked', 'document') */
  strategy: string;
  /** Embedding provider name (e.g., 'openai', 'gpt-oss-14b', 'qwen3-14b') */
  embeddingProvider?: string;
  /** Embedding provider configuration */
  embedding: EmbeddingConfig;
  /** Qdrant insertion configuration */
  qdrant: QdrantInsertConfig;
  /** Log progress every N paragraphs (default: 1000) */
  logInterval?: number;
  /** Optional total expected paragraph count for ETA */
  totalExpectedParagraphs?: number;
}
