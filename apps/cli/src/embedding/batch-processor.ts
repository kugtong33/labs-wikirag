/**
 * Batch processor for paragraph embedding generation
 *
 * Accumulates paragraphs into batches and processes them
 * through any embedding provider via the EmbeddingProvider interface.
 *
 * @module embedding/batch-processor
 */

import * as R from 'ramda';
import type {
  ParsedParagraph,
  EmbeddedParagraph,
  WikipediaPayload,
  BatchEmbeddingResult,
} from './types.js';
import type { EmbeddingProvider } from '@wikirag/embeddings';
import { BatchProcessingError } from './errors.js';

/**
 * Configuration for batch processing
 */
export interface BatchProcessorConfig {
  /** Batch size (default: 100) */
  batchSize?: number;
  /** Wikipedia dump version */
  dumpVersion: string;
  /** Embedding model name */
  embeddingModel: string;
  /** Embedding provider instance */
  embeddingProvider: EmbeddingProvider;
}

/**
 * Default batch size
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Batch processor for embedding generation
 *
 * This processor:
 * - Groups paragraphs into batches
 * - Generates embeddings for each batch
 * - Combines embeddings with metadata
 * - Handles partial batch failures
 *
 * @example
 * ```typescript
 * const processor = new BatchProcessor({
 *   dumpVersion: '20260210',
 *   embeddingModel: 'text-embedding-3-small',
 *   embeddingProvider: provider
 * });
 *
 * for await (const embedded of processor.processBatches(paragraphs)) {
 *   // Process embedded paragraphs
 * }
 * ```
 */
export class BatchProcessor {
  private config: Required<BatchProcessorConfig>;
  private metrics: { apiCallsMade: number; rateLimitHits: number };

  constructor(config: BatchProcessorConfig) {
    this.config = {
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
      dumpVersion: config.dumpVersion,
      embeddingModel: config.embeddingModel,
      embeddingProvider: config.embeddingProvider,
    };
    this.metrics = { apiCallsMade: 0, rateLimitHits: 0 };
  }

  /**
   * Process an async iterable of paragraphs in batches
   *
   * Yields embedded paragraphs as they are processed.
   * Handles partial batch failures by logging errors and continuing.
   *
   * @param paragraphs - Async iterable of parsed paragraphs
   * @yields Embedded paragraphs ready for Qdrant insertion
   */
  public async *processBatches(
    paragraphs: AsyncIterable<ParsedParagraph>
  ): AsyncGenerator<EmbeddedParagraph[], void, undefined> {
    let batch: ParsedParagraph[] = [];

    for await (const paragraph of paragraphs) {
      batch.push(paragraph);

      // Process batch when it reaches target size
      if (batch.length >= this.config.batchSize) {
        const embedded = await this.processBatch(batch);
        if (embedded.length > 0) {
          yield embedded;
        }
        batch = [];
      }
    }

    // Process final partial batch
    if (batch.length > 0) {
      const embedded = await this.processBatch(batch);
      if (embedded.length > 0) {
        yield embedded;
      }
    }
  }

  /**
   * Process a single batch of paragraphs
   *
   * Steps:
   * 1. Extract content for embedding
   * 2. Generate embeddings via provider
   * 3. Combine embeddings with metadata
   * 4. Handle any failures
   *
   * @param batch - Array of paragraphs to process
   * @returns Array of embedded paragraphs
   */
  private async processBatch(batch: ParsedParagraph[]): Promise<EmbeddedParagraph[]> {
    try {
      // Extract text content for embedding using Ramda
      const texts = R.pluck('content', batch);

      // Generate embeddings via provider
      const result = await this.config.embeddingProvider.embedBatch(texts);
      this.metrics.apiCallsMade += 1;
      this.metrics.rateLimitHits += result.rateLimitHits;

      // Handle complete batch failure
      if (result.embeddings.length === 0) {
        console.error(
          `Batch embedding failed for ${batch.length} paragraphs: ${result.errors[0] || 'Unknown error'}`
        );
        throw new BatchProcessingError(
          `Failed to embed batch of ${batch.length} paragraphs`,
          batch.length,
          batch.length,
          new Error(result.errors[0] || 'Unknown error')
        );
      }

      // Handle partial batch failures
      if (result.failedIndices.length > 0) {
        console.warn(
          `Partial batch failure: ${result.failedIndices.length}/${batch.length} paragraphs failed`
        );

        // Log details of failed items
        result.failedIndices.forEach((idx) => {
          const paragraph = batch[idx];
          const error = result.errors[idx] || 'Unknown error';
          console.warn(
            `Failed to embed paragraph from "${paragraph.articleTitle}" section "${paragraph.sectionName}": ${error}`
          );
        });
      }

      // Combine embeddings with metadata using Ramda
      const embedded = this.combineWithMetadata(batch, result);

      return embedded;
    } catch (error) {
      // Log error and re-throw
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Batch processing error: ${message}`);

      // If this is already a BatchProcessingError, re-throw it
      if (error instanceof BatchProcessingError) {
        throw error;
      }

      // Otherwise, wrap in BatchProcessingError
      throw new BatchProcessingError(
        `Failed to process batch: ${message}`,
        batch.length,
        batch.length,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Combine embeddings with paragraph metadata
   *
   * Creates EmbeddedParagraph objects by pairing each embedding
   * with its corresponding paragraph metadata.
   *
   * @param paragraphs - Original paragraphs
   * @param result - Batch embedding result
   * @returns Array of embedded paragraphs
   */
  private combineWithMetadata(
    paragraphs: ParsedParagraph[],
    result: BatchEmbeddingResult
  ): EmbeddedParagraph[] {
    const successfulIndices =
      result.successIndices.length > 0
        ? result.successIndices
        : R.pipe(
            R.range(0),
            R.reject((idx: number) => R.includes(idx, result.failedIndices))
          )(paragraphs.length);

    // Create metadata transformation function using Ramda curry
    const createEmbedded = this.createMetadataTransformer(
      this.config.dumpVersion,
      this.config.embeddingModel
    );

    // Map successful embeddings to EmbeddedParagraph objects
    const embedded = R.addIndex<number, EmbeddedParagraph>(R.map)(
      (idx: number, successIdx: number) =>
        createEmbedded(
          paragraphs[idx as number],
          result.embeddings[successIdx as number]
        ),
      successfulIndices
    );

    return embedded;
  }

  /**
   * Create a curried function for transforming paragraphs with embeddings
   *
   * Uses Ramda curry pattern for functional composition.
   *
   * @param dumpVersion - Wikipedia dump version
   * @param embeddingModel - Embedding model name
   * @returns Curried transformation function
   */
  private createMetadataTransformer(
    dumpVersion: string,
    embeddingModel: string
  ): (paragraph: ParsedParagraph, embedding: number[]) => EmbeddedParagraph {
    return R.curry(
      (paragraph: ParsedParagraph, embedding: number[]): EmbeddedParagraph => ({
        vector: embedding,
        payload: this.createPayload(paragraph, dumpVersion, embeddingModel),
      })
    );
  }

  /**
   * Create Qdrant payload from paragraph and metadata
   *
   * @param paragraph - Parsed paragraph
   * @param dumpVersion - Wikipedia dump version
   * @param embeddingModel - Embedding model name
   * @returns Wikipedia payload
   */
  private createPayload(
    paragraph: ParsedParagraph,
    dumpVersion: string,
    embeddingModel: string
  ): WikipediaPayload {
    return {
      articleTitle: paragraph.articleTitle,
      articleId: paragraph.articleId,
      sectionName: paragraph.sectionName,
      paragraphPosition: paragraph.paragraphPosition,
      dumpVersion,
      embeddingModel,
    };
  }

  /**
   * Get current configuration
   *
   * @returns Current processor configuration
   */
  public getConfig(): Required<BatchProcessorConfig> {
    return R.clone(this.config);
  }

  /**
   * Get current batch processing metrics
   */
  public getMetrics(): { apiCallsMade: number; rateLimitHits: number } {
    return R.clone(this.metrics);
  }
}
