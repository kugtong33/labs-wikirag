/**
 * Naive RAG — passthrough query adapter
 *
 * Stage 1: copies the raw query into processedQuery unchanged.
 * Naive RAG performs no query transformation.
 *
 * @module core/techniques/naive-rag/query-adapter
 */

import type { QueryAdapter } from '../../types/query-adapter.js';
import type { PipelineContext } from '../../types/pipeline-context.js';

/**
 * Passthrough query adapter — returns the query string unmodified.
 *
 * Used by Naive RAG as a no-op Stage 1.
 */
export class PassthroughQueryAdapter implements QueryAdapter {
  readonly name = 'passthrough-query';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    return { ...context, processedQuery: context.query };
  }
}
