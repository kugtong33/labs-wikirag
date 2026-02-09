/**
 * Metadata payload structure for Wikipedia paragraph vectors
 * Stored in Qdrant payload field alongside the vector embedding
 */
export interface WikipediaPayload {
  /** Wikipedia article title */
  articleTitle: string;

  /** Section name within the article (empty string if no section) */
  sectionName: string;

  /** Position of paragraph within the article/section (0-indexed) */
  paragraphPosition: number;

  /** Wikipedia dump date in YYYYMMDD format */
  dumpVersion: string;

  /** OpenAI embedding model used (e.g., "text-embedding-3-small") */
  embeddingModel: string;
}

/**
 * Result from a similarity search operation
 * Includes the matched document's payload and similarity score
 */
export interface SearchResult {
  /** Unique identifier for the document in Qdrant */
  id: string | number;

  /** Similarity score (higher is more similar) */
  score: number;

  /** Metadata payload for the matched document */
  payload: WikipediaPayload;

  /** Optional: the vector embedding itself */
  vector?: number[];
}

/**
 * Configuration for creating a Qdrant collection
 */
export interface CollectionConfig {
  /** Collection name following wiki-{strategy}-{dump_date} convention */
  name: string;

  /** Dimension size of the vector embeddings */
  vectorSize: number;

  /** Distance metric for similarity comparison */
  distance: 'Cosine' | 'Euclid' | 'Dot';
}

/**
 * Custom error for Qdrant operations
 */
export class QdrantError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly collectionName?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'QdrantError';
  }
}
