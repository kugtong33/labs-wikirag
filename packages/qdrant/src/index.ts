/**
 * @wikirag/qdrant
 *
 * Qdrant client wrapper for WikiRAG project
 * Provides collection management and similarity search operations
 * with enforced naming conventions for Wikipedia embeddings
 */

// Export client wrapper and singleton
export { QdrantClientWrapper, qdrantClient } from './client.js';

// Export collection manager and singleton
export { CollectionManager, collectionManager } from './collections.js';

// Export search manager and singleton
export { SearchManager, searchManager } from './search.js';

// Export types
export type {
  WikipediaPayload,
  SearchResult,
  CollectionConfig,
} from './types.js';

// Export custom error
export { QdrantError } from './types.js';
