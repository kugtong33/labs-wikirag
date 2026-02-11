import * as R from 'ramda';
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

      // Map Qdrant response to our SearchResult type using Ramda
      const parseVector = R.ifElse(
        R.both(
          R.is(Array),
          R.pipe(R.head, R.is(Number))
        ),
        R.identity,
        R.always(undefined)
      );

      const mapPoint = (point: any): SearchResult => ({
        id: point.id,
        score: point.score,
        payload: point.payload as WikipediaPayload,
        vector: parseVector(point.vector) as number[] | undefined,
      });

      return R.map(mapPoint, response);
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

      const parseVectorArray = R.ifElse(
        R.both(
          R.is(Array),
          R.pipe(R.head, R.is(Number))
        ),
        R.identity,
        R.always([])
      );

      const mapPointWithVector = (point: any): SearchResult => ({
        id: point.id,
        score: point.score,
        payload: point.payload as WikipediaPayload,
        vector: parseVectorArray(point.vector) as number[] | undefined,
      });

      return R.map(mapPointWithVector, response);
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

      const mapScrollPoint = (point: any) => ({
        id: point.id,
        payload: point.payload as WikipediaPayload,
      });

      return R.map(mapScrollPoint, response.points);
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
