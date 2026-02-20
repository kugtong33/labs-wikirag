/**
 * Generation adapter interface
 *
 * The GenerationAdapter is Stage 5 (the final stage) of the RAG pipeline.
 * It produces the natural-language response from the refined documents
 * and the original user query.
 *
 * @module core/types/generation-adapter
 *
 * @example
 * ```typescript
 * // Simple context-concatenation generator (for testing)
 * const echoGenerator: GenerationAdapter = {
 *   name: 'echo-generator',
 *   async execute(ctx) {
 *     const docs = ctx.refinedDocuments ?? ctx.retrievedDocuments ?? [];
 *     const context = docs.map(d => d.content).join('\n\n');
 *     return { ...ctx, response: `Query: ${ctx.query}\n\nContext:\n${context}` };
 *   },
 * };
 * ```
 */

import type { PipelineContext } from './pipeline-context.js';

/**
 * Stage 5 — Response generation.
 *
 * Receives the full context (query + retrieved/refined documents) and
 * produces the final text response stored as `context.response`.
 */
export interface GenerationAdapter {
  /** Unique adapter identifier */
  readonly name: string;

  /**
   * Generate the final response.
   *
   * @param context - Pipeline context with `refinedDocuments` (or `retrievedDocuments`) set
   * @returns Updated context with `response` populated
   */
  execute(context: PipelineContext): Promise<PipelineContext>;
}
