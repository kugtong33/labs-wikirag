/**
 * Custom error class for Wikipedia parser operations
 * Follows the QdrantError pattern from packages/qdrant/src/types.ts
 */
export class WikipediaParserError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly articleTitle?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WikipediaParserError';
  }
}
