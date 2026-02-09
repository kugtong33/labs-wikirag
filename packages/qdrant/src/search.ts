import { QdrantClientWrapper } from './client.js';
import { SearchResult, WikipediaPayload, QdrantError } from './types.js';

/**
 * Manager for Qdrant search operations
 * Handles similarity search with Wikipedia payloads
 */
export class SearchManager {
  constructor(private clientWrapper: QdrantClientWrapper) {}

  /**
   * Perform similarity search on a collection
   * @param collectionName - Name of the collection to search
   * @param queryVector - Query embedding vector
   * @param limit - Maximum number of results to return (default: 10)
   * @param scoreThreshold - Minimum similarity score threshold (optional)
   * @returns Array of search results ordered by similarity score (descending)
   */
  async similaritySearch(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    scoreThreshold?: number
  ): Promise<SearchResult[]> {
    try {
      const client = this.clientWrapper.getClient();

      // Perform the search
      const response = await client.search(collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false, // Don't return vectors by default (can be large)
      });

      // Map Qdrant response to our SearchResult type
      return response.map((point) => {
        // Handle vector type - ensure it's number[] or undefined
        let vector: number[] | undefined;
        if (Array.isArray(point.vector)) {
          // Check if it's a 1D array
          if (point.vector.length > 0 && typeof point.vector[0] === 'number') {
            vector = point.vector as number[];
          }
        }

        return {
          id: point.id,
          score: point.score,
          payload: point.payload as unknown as WikipediaPayload,
          vector,
        };
      });
    } catch (error) {
      throw new QdrantError(
        `Failed to perform similarity search on ${collectionName}`,
        'similaritySearch',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * Perform similarity search with vector retrieval
   * Same as similaritySearch but includes the vector embeddings in results
   * @param collectionName - Name of the collection to search
   * @param queryVector - Query embedding vector
   * @param limit - Maximum number of results to return (default: 10)
   * @param scoreThreshold - Minimum similarity score threshold (optional)
   * @returns Array of search results with vectors
   */
  async similaritySearchWithVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    scoreThreshold?: number
  ): Promise<SearchResult[]> {
    try {
      const client = this.clientWrapper.getClient();

      const response = await client.search(collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: true, // Include vectors in response
      });

      return response.map((point) => {
        // Handle vector type - ensure it's number[]
        let vector: number[] = [];
        if (Array.isArray(point.vector)) {
          // Check if it's a 1D array
          if (point.vector.length > 0 && typeof point.vector[0] === 'number') {
            vector = point.vector as number[];
          }
        }

        return {
          id: point.id,
          score: point.score,
          payload: point.payload as unknown as WikipediaPayload,
          vector,
        };
      });
    } catch (error) {
      throw new QdrantError(
        `Failed to perform similarity search with vectors on ${collectionName}`,
        'similaritySearchWithVectors',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * Scroll through all points in a collection
   * Useful for batch operations or data export
   * @param collectionName - Name of the collection
   * @param limit - Number of points to retrieve per scroll (default: 100)
   * @returns Array of points with their payloads
   */
  async scrollPoints(
    collectionName: string,
    limit: number = 100
  ): Promise<Array<{ id: string | number; payload: WikipediaPayload }>> {
    try {
      const client = this.clientWrapper.getClient();

      const response = await client.scroll(collectionName, {
        limit,
        with_payload: true,
        with_vector: false,
      });

      return response.points.map((point) => ({
        id: point.id,
        payload: point.payload as unknown as WikipediaPayload,
      }));
    } catch (error) {
      throw new QdrantError(
        `Failed to scroll points in ${collectionName}`,
        'scrollPoints',
        collectionName,
        error as Error
      );
    }
  }

  /**
   * Count total number of points in a collection
   * @param collectionName - Name of the collection
   * @returns Total count of vectors in the collection
   */
  async count(collectionName: string): Promise<number> {
    try {
      const client = this.clientWrapper.getClient();

      const response = await client.count(collectionName);
      return response.count;
    } catch (error) {
      throw new QdrantError(
        `Failed to count points in ${collectionName}`,
        'count',
        collectionName,
        error as Error
      );
    }
  }
}

/**
 * Singleton instance of SearchManager
 * Uses the singleton qdrantClient
 */
import { qdrantClient } from './client.js';
export const searchManager = new SearchManager(qdrantClient);
