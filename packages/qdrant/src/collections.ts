import * as R from 'ramda';
import { QdrantClientWrapper } from './client.js';
import { CollectionConfig, QdrantError } from './types.js';

/**
 * Manager for Qdrant collection operations
 * Enforces naming conventions and provides CRUD operations
 */
export class CollectionManager {
  constructor(private clientWrapper: QdrantClientWrapper) {}

  /**
   * Create a collection name following the wiki-{strategy}-{dump_date} convention
   * @param strategy - Embedding strategy (e.g., "paragraph", "chunked", "document")
   * @param dumpDate - Wikipedia dump date in YYYYMMDD format
   * @returns Formatted collection name
   */
  private formatCollectionName(strategy: string, dumpDate: string): string {
    return `wiki-${strategy}-${dumpDate}`;
  }

  /**
   * Create a new Qdrant collection for Wikipedia embeddings
   * @param strategy - Embedding strategy name
   * @param dumpDate - Wikipedia dump date (YYYYMMDD format)
   * @param vectorSize - Dimension size of embeddings (e.g., 1536 for text-embedding-3-small)
   * @param distance - Distance metric (default: Cosine)
   * @returns The created collection name
   */
  async createCollection(
    strategy: string,
    dumpDate: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<string> {
    const collectionName = this.formatCollectionName(strategy, dumpDate);

    try {
      const client = this.clientWrapper.getClient();

      // Check if collection already exists
      const exists = await this.collectionExists(collectionName);
      if (exists) {
        throw new QdrantError(
          `Collection ${collectionName} already exists`,
          'createCollection',
          collectionName
        );
      }

      // Create the collection with vector configuration
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance,
        },
        // Store payload on disk for large collections
        on_disk_payload: true,
        // HNSW indexing parameters for optimal search performance
        hnsw_config: {
          m: 16,
          ef_construct: 100,
        },
      });

      return collectionName;
    } catch (error) {
      if (error instanceof QdrantError) {
        throw error;
      }
      throw new QdrantError(
        `Failed to create collection ${collectionName}`,
        'createCollection',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * Check if a collection exists
   * @param collectionName - Name of the collection
   * @returns true if collection exists, false otherwise
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      const client = this.clientWrapper.getClient();
      const response = await client.getCollections();

      return R.any(R.propEq(collectionName, 'name'))(response.collections);
    } catch (error) {
      throw new QdrantError(
        `Failed to check if collection ${collectionName} exists`,
        'collectionExists',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * Delete a collection
   * @param collectionName - Name of the collection to delete
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      const client = this.clientWrapper.getClient();

      // Check if collection exists before deleting
      const exists = await this.collectionExists(collectionName);
      if (!exists) {
        throw new QdrantError(
          `Collection ${collectionName} does not exist`,
          'deleteCollection',
          collectionName
        );
      }

      await client.deleteCollection(collectionName);
    } catch (error) {
      if (error instanceof QdrantError) {
        throw error;
      }
      throw new QdrantError(
        `Failed to delete collection ${collectionName}`,
        'deleteCollection',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * List all collections
   * @returns Array of collection names
   */
  async listCollections(): Promise<string[]> {
    try {
      const client = this.clientWrapper.getClient();
      const response = await client.getCollections();

      return R.pluck('name', response.collections);
    } catch (error) {
      throw new QdrantError(
        'Failed to list collections',
        'listCollections',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get collection info including vector size and count
   * @param collectionName - Name of the collection
   * @returns Collection information
   */
  async getCollectionInfo(collectionName: string): Promise<{
    vectorsCount: number;
    vectorSize: number;
    distance: string;
  }> {
    try {
      const client = this.clientWrapper.getClient();
      const info = await client.getCollection(collectionName);

      // Handle different vector configuration structures using Ramda
      const vectorsConfig = R.pathOr({}, ['config', 'params', 'vectors'], info);

      const vectorSize = R.when(
        R.both(R.is(Object), R.has('size')),
        R.pipe(
          R.prop('size'),
          R.when(R.is(Number), R.identity)
        )
      )(vectorsConfig) || 0;

      const distance = R.when(
        R.both(R.is(Object), R.has('distance')),
        R.pipe(
          R.prop('distance'),
          R.when(R.is(String), R.identity)
        )
      )(vectorsConfig) || 'Cosine';

      return {
        vectorsCount: R.propOr(0, 'points_count', info),
        vectorSize,
        distance,
      };
    } catch (error) {
      throw new QdrantError(
        `Failed to get collection info for ${collectionName}`,
        'getCollectionInfo',
        collectionName,
        error as Error
      );
    }
  }
}

/**
 * Singleton instance of CollectionManager
 * Uses the singleton qdrantClient
 */
import { qdrantClient } from './client.js';
export const collectionManager = new CollectionManager(qdrantClient);
