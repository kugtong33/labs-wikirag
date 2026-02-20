/**
 * Query adapter interface
 *
 * The QueryAdapter is the first stage of the RAG pipeline. It receives the raw
 * user query and transforms it into a processed form suitable for the next stage.
 *
 * @module core/types/query-adapter
 *
 * @example
 * ```typescript
 * // Passthrough query adapter (identity)
 * const passthroughQuery: QueryAdapter = {
 *   name: 'passthrough-query',
 *   async execute(ctx) {
 *     return { ...ctx, processedQuery: ctx.query };
 *   },
 * };
 * ```
 */

import type { PipelineContext } from './pipeline-context.js';

/**
 * Stage 1 — Query transformation.
 *
 * Receives the raw user query and may normalise, expand, or rewrite it.
 * The result is stored as `context.processedQuery`.
 */
export interface QueryAdapter {
  /** Unique adapter identifier */
  readonly name: string;

  /**
   * Transform the raw query.
   *
   * @param context - Pipeline context (context.query is the raw input)
   * @returns Updated context with `processedQuery` populated
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}
