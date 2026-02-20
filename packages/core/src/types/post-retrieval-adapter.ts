/**
 * Post-retrieval adapter interface
 *
 * The PostRetrievalAdapter is an optional Stage 4 in the RAG pipeline.
 * It processes or re-ranks the retrieved documents before generation —
 * for example by applying a cross-encoder, deduplication, or custom scoring.
 *
 * @module core/types/post-retrieval-adapter
 *
 * @example
 * ```typescript
 * // Score-threshold post-retrieval filter
 * const thresholdFilter: PostRetrievalAdapter = {
 *   name: 'threshold-filter',
 *   async execute(ctx) {
 *     const filtered = (ctx.retrievedDocuments ?? []).filter(d => d.score >= 0.7);
 *     return { ...ctx, refinedDocuments: filtered };
 *   },
 * };
 * ```
 */

import type { PipelineContext } from './pipeline-context.js';

/**
 * Stage 4 (optional) — Post-retrieval document refinement.
 *
 * Receives `context.retrievedDocuments` and produces `context.refinedDocuments`
 * after any desired filtering, re-ranking, or augmentation.
 */
export interface PostRetrievalAdapter {
  /** Unique adapter identifier */
  readonly name: string;

  /**
   * Refine retrieved documents.
   *
   * @param context - Pipeline context with `retrievedDocuments` set
   * @returns Updated context with `refinedDocuments` populated
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}
