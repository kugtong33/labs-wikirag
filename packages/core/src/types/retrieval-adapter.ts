/**
 * Retrieval adapter interface
 *
 * The RetrievalAdapter is Stage 3 of the RAG pipeline. It fetches relevant
 * documents from the vector store using the prepared retrieval query.
 *
 * @module core/types/retrieval-adapter
 *
 * @example
 * ```typescript
 * // Qdrant-based retrieval adapter
 * const qdrantRetrieval: RetrievalAdapter = {
 *   name: 'qdrant-retrieval',
 *   async execute(ctx) {
 *     const vector = ctx.retrievalQuery as number[];
 *     const docs = await searchManager.similaritySearch(
 *       ctx.config.collectionName, vector, ctx.config.topK
 *     );
 *     return { ...ctx, retrievedDocuments: docs.map(mapToRetrievedDocument) };
 *   },
 * };
 * ```
 */

import type { PipelineContext } from './pipeline-context.js';

/**
 * Stage 3 — Document retrieval.
 *
 * Searches the vector store with `context.retrievalQuery` and stores
 * the top-k results as `context.retrievedDocuments`.
 */
export interface RetrievalAdapter {
  /** Unique adapter identifier */
  readonly name: string;

  /**
   * Retrieve relevant documents.
   *
   * @param context - Pipeline context with `retrievalQuery` set
   * @returns Updated context with `retrievedDocuments` populated
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}
