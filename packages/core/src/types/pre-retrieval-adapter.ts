/**
 * Pre-retrieval adapter interface
 *
 * The PreRetrievalAdapter is an optional Stage 2 in the RAG pipeline.
 * It converts the processed query into a form ready for vector retrieval
 * (e.g., generating an embedding, expanding to multiple sub-queries).
 *
 * @module core/types/pre-retrieval-adapter
 *
 * @example
 * ```typescript
 * // Embedding-based pre-retrieval adapter
 * const embeddingPreRetrieval: PreRetrievalAdapter = {
 *   name: 'embedding-pre-retrieval',
 *   async execute(ctx) {
 *     const vector = await embeddingProvider.embed(String(ctx.processedQuery ?? ctx.query));
 *     return { ...ctx, retrievalQuery: vector };
 *   },
 * };
 * ```
 */

import type { PipelineContext } from './pipeline-context.js';

/**
 * Stage 2 (optional) — Pre-retrieval query preparation.
 *
 * Converts `processedQuery` into a `retrievalQuery` that the RetrievalAdapter
 * can use to search the vector store. Typically generates embeddings.
 */
export interface PreRetrievalAdapter {
  /** Unique adapter identifier */
  readonly name: string;

  /**
   * Prepare the query for retrieval.
   *
   * @param context - Pipeline context with `processedQuery` set by QueryAdapter
   * @returns Updated context with `retrievalQuery` populated
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}
