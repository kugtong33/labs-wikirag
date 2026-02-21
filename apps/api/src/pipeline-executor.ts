/**
 * Pipeline executor
 *
 * Runs all adapter stages for a given Technique in sequence,
 * threading PipelineContext through each stage immutably.
 *
 * @module api/pipeline-executor
 */

import type { Technique, PipelineContext } from '@wikirag/core';

/**
 * Execute a RAG technique's full adapter pipeline.
 *
 * Stages execute in order: query → preRetrieval? → retrieval → postRetrieval? → generation
 * Each adapter receives the context produced by the previous stage.
 *
 * @param technique - Registered technique to execute
 * @param context   - Initial pipeline context (query + config)
 * @returns Enriched context with `response` populated
 */
export async function executePipeline(
  technique: Technique,
  context: PipelineContext,
): Promise<PipelineContext> {
  const { adapters } = technique;

  let ctx = await adapters.query.execute(context);

  if (adapters.preRetrieval) {
    ctx = await adapters.preRetrieval.execute(ctx);
  }

  ctx = await adapters.retrieval.execute(ctx);

  if (adapters.postRetrieval) {
    ctx = await adapters.postRetrieval.execute(ctx);
  }

  ctx = await adapters.generation.execute(ctx);

  return ctx;
}
