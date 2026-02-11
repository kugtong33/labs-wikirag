/**
 * Qdrant insertion handler for embedded paragraphs
 *
 * Manages batch insertion of vector embeddings with metadata
 * into Qdrant collections.
 *
 * @module embedding/qdrant-inserter
 */

import * as R from 'ramda';
import type { EmbeddedParagraph, QdrantInsertConfig } from './types';
import { collectionManager, type CollectionManager } from '@wikirag/qdrant';
import { QdrantInsertError } from './errors';

// Define Qdrant client type inline to avoid import issues
type QdrantClient = {
  upsert: (collectionName: string, options: { wait: boolean; points: any[] }) => Promise<any>;
};

/**
 * Default batch size for Qdrant insertions
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Point structure for Qdrant upsert operation
 */
interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

/**
 * Qdrant insertion handler
 *
 * This handler:
 * - Manages batch insertions to Qdrant
 * - Ensures collection exists before insertion
 * - Generates unique IDs for vectors
 * - Handles insertion errors gracefully
 *
 * @example
 * ```typescript
 * const inserter = new QdrantInserter({
 *   collectionName: 'wiki-paragraph-20260210',
 *   batchSize: 100
 * }, qdrantClient, collectionManager);
 *
 * for await (const result of inserter.insertBatches(embeddedParagraphs)) {
 *   console.log(`Inserted ${result.count} paragraphs`);
 * }
 * ```
 */
export class QdrantInserter {
  private config: Required<QdrantInsertConfig>;
  private client: QdrantClient;
  private collectionManager: CollectionManager;
  private insertedCount: number = 0;

  constructor(
    config: QdrantInsertConfig,
    client: QdrantClient,
    manager: CollectionManager = collectionManager
  ) {
    this.config = {
      collectionName: config.collectionName,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
    };
    this.client = client;
    this.collectionManager = manager;
  }

  /**
   * Insert embedded paragraphs in batches
   *
   * Ensures collection exists before starting insertions.
   * Yields insertion results as batches are processed.
   *
   * @param paragraphs - Async iterable of embedded paragraphs
   * @yields Insertion result for each batch
   */
  public async *insertBatches(
    paragraphs: AsyncIterable<EmbeddedParagraph[]>
  ): AsyncGenerator<{ count: number; batchSize: number }, void, undefined> {
    // Ensure collection exists before starting
    await this.ensureCollection();

    for await (const batch of paragraphs) {
      const count = await this.insertBatch(batch);
      this.insertedCount += count;
      yield { count, batchSize: batch.length };
    }
  }

  /**
   * Insert a single batch of embedded paragraphs
   *
   * Steps:
   * 1. Convert to Qdrant point format
   * 2. Perform upsert operation
   * 3. Handle any errors
   *
   * @param batch - Array of embedded paragraphs
   * @returns Number of successfully inserted paragraphs
   */
  private async insertBatch(batch: EmbeddedParagraph[]): Promise<number> {
    if (R.isEmpty(batch)) {
      return 0;
    }

    try {
      // Convert embedded paragraphs to Qdrant points
      const points = this.convertToPoints(batch);

      // Perform upsert operation
      await this.client.upsert(this.config.collectionName, {
        wait: true,
        points,
      });

      return batch.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to insert batch of ${batch.length} paragraphs: ${message}`
      );

      throw new QdrantInsertError(
        `Qdrant insertion failed: ${message}`,
        batch.length,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Convert embedded paragraphs to Qdrant point format
   *
   * Generates unique IDs based on article title, section, and position.
   * Uses Ramda for functional transformation.
   *
   * @param paragraphs - Embedded paragraphs
   * @returns Array of Qdrant points
   */
  private convertToPoints(paragraphs: EmbeddedParagraph[]): QdrantPoint[] {
    const mapIndexed = R.addIndex<EmbeddedParagraph, QdrantPoint>(R.map);
    return mapIndexed((paragraph: EmbeddedParagraph, index: number) => ({
      id: this.generatePointId(paragraph, index),
      vector: paragraph.vector,
      payload: {
        articleTitle: paragraph.payload.articleTitle,
        sectionName: paragraph.payload.sectionName,
        paragraphPosition: paragraph.payload.paragraphPosition,
        dumpVersion: paragraph.payload.dumpVersion,
        embeddingModel: paragraph.payload.embeddingModel,
      },
    }), paragraphs);
  }

  /**
   * Generate a unique point ID for a paragraph
   *
   * ID format: {articleTitle}:{sectionName}:{paragraphPosition}:{globalIndex}
   * - Uses URL-safe encoding for article/section names
   * - Includes global insertion count for uniqueness
   *
   * @param paragraph - Embedded paragraph
   * @param batchIndex - Index within current batch
   * @returns Unique point ID
   */
  private generatePointId(paragraph: EmbeddedParagraph, batchIndex: number): string {
    const { articleTitle, sectionName, paragraphPosition } = paragraph.payload;

    // URL-safe encoding using Ramda
    const encode = R.pipe(
      R.replace(/ /g, '_'),
      R.replace(/[^a-zA-Z0-9_-]/g, '')
    );

    const encodedTitle = encode(articleTitle);
    const encodedSection = encode(sectionName || 'intro');
    const globalIndex = this.insertedCount + batchIndex;

    return `${encodedTitle}:${encodedSection}:${paragraphPosition}:${globalIndex}`;
  }

  /**
   * Ensure collection exists before insertion
   *
   * Checks if collection exists using CollectionManager.
   * Throws error if collection doesn't exist.
   *
   * @throws {QdrantInsertError} If collection doesn't exist
   */
  private async ensureCollection(): Promise<void> {
    try {
      const exists = await this.collectionManager.collectionExists(
        this.config.collectionName
      );

      if (!exists) {
        throw new QdrantInsertError(
          `Collection ${this.config.collectionName} does not exist. Create it first using CollectionManager.`,
          0
        );
      }
    } catch (error) {
      if (error instanceof QdrantInsertError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new QdrantInsertError(
        `Failed to verify collection existence: ${message}`,
        0,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get total number of paragraphs inserted
   *
   * @returns Total inserted count
   */
  public getInsertedCount(): number {
    return this.insertedCount;
  }

  /**
   * Get current configuration
   *
   * @returns Current inserter configuration
   */
  public getConfig(): Required<QdrantInsertConfig> {
    return R.clone(this.config);
  }
}
