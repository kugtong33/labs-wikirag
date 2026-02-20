/**
 * Naive RAG — generation adapter
 *
 * Stage 5: formats retrieved Wikipedia paragraphs as context and calls
 * OpenAI chat completions to produce a grounded natural-language response.
 *
 * @module core/techniques/naive-rag/generation-adapter
 */

import * as R from 'ramda';
import OpenAI from 'openai';
import type { GenerationAdapter } from '../../types/generation-adapter.js';
import type { PipelineContext, RetrievedDocument } from '../../types/pipeline-context.js';

/** Default chat model used for generation */
export const DEFAULT_GENERATION_MODEL = 'gpt-4o-mini';

/** Maximum number of context documents included in the prompt */
const MAX_CONTEXT_DOCS = 10;

/**
 * Format a single RetrievedDocument as a numbered context entry.
 */
const formatDocument = (doc: RetrievedDocument, index: number): string =>
  `[${index + 1}] ${doc.content} (relevance: ${doc.score.toFixed(3)})`;

/**
 * Build the context block from retrieved documents.
 * Uses Ramda's addIndex + map for functional indexed mapping.
 */
const buildContext = (docs: RetrievedDocument[]): string => {
  const limited = R.take(MAX_CONTEXT_DOCS, docs);
  const mapIndexed = R.addIndex<RetrievedDocument, string>(R.map);
  return mapIndexed(formatDocument, limited).join('\n');
};

/**
 * System prompt instructing the LLM to answer from Wikipedia context.
 */
const SYSTEM_PROMPT =
  'You are a helpful assistant that answers questions based on Wikipedia articles. ' +
  'Use the provided context to give accurate, factual answers. ' +
  'If the context does not contain enough information to answer the question, ' +
  'say so clearly rather than guessing.';

/**
 * Naive RAG generation adapter.
 *
 * Composes a chat prompt from the retrieved documents and the original
 * user query, then calls OpenAI chat completions.
 *
 * @example
 * ```typescript
 * const adapter = new NaiveRagGenerationAdapter(
 *   new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
 *   'gpt-4o-mini'
 * );
 * const result = await adapter.execute(context);
 * // result.response → generated answer string
 * ```
 */
export class NaiveRagGenerationAdapter implements GenerationAdapter {
  readonly name = 'naive-rag-generation';

  constructor(
    private readonly client: OpenAI,
    private readonly model: string = DEFAULT_GENERATION_MODEL,
  ) {}

  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Use refined documents if post-retrieval ran, else fall back to retrieved
    const docs = context.refinedDocuments ?? context.retrievedDocuments ?? [];

    const contextBlock = buildContext(docs);
    const userMessage = docs.length > 0
      ? `Based on the following Wikipedia articles, answer the question.\n\nContext:\n${contextBlock}\n\nQuestion: ${context.query}`
      : `I could not find relevant Wikipedia articles for this question. Please answer as best you can.\n\nQuestion: ${context.query}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const response = completion.choices[0]?.message?.content ?? '';

    return { ...context, response };
  }
}
