/**
 * Simple RAG — query expansion adapter
 *
 * Stage 1: uses an OpenAI chat completion to reformulate the raw user query
 * into a more retrieval-friendly form. The expanded query is stored in
 * `processedQuery` and used by the downstream RetrievalAdapter for
 * embedding-based vector search.
 *
 * @module core/techniques/simple-rag/query-expansion-adapter
 */

import OpenAI from 'openai';
import type { QueryAdapter } from '../../types/query-adapter.js';
import type { PipelineContext } from '../../types/pipeline-context.js';

/**
 * System prompt for the query expansion LLM call.
 *
 * Instructs the model to produce a single, search-optimised restatement
 * of the input question — no preamble, no list items.
 */
const EXPANSION_SYSTEM_PROMPT =
  'You are a search query optimiser for a Wikipedia vector search engine. ' +
  'Rewrite the user question into a concise, information-dense search phrase ' +
  'that captures the key entities and concepts. ' +
  'Output only the rewritten query — no explanation, no punctuation beyond the query itself.';

/**
 * Simple RAG query expansion adapter.
 *
 * Reformulates the raw user query using an LLM so that the subsequent
 * vector similarity search retrieves more relevant Wikipedia paragraphs.
 *
 * @example
 * ```typescript
 * const adapter = new QueryExpansionAdapter(new OpenAI({ apiKey }), 'gpt-4o-mini');
 * const result = await adapter.execute(context);
 * // result.processedQuery → expanded/reformulated query string
 * ```
 */
export class QueryExpansionAdapter implements QueryAdapter {
  readonly name = 'simple-rag-query-expansion';

  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: EXPANSION_SYSTEM_PROMPT },
        { role: 'user', content: context.query },
      ],
      max_tokens: 128,
      temperature: 0,
    });

    const expanded = completion.choices[0]?.message?.content?.trim() ?? context.query;

    // Fall back to the original query if the model returns an empty response
    const processedQuery = expanded.length > 0 ? expanded : context.query;

    return { ...context, processedQuery };
  }
}
