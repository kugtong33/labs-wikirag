/**
 * Simple RAG technique
 *
 * An enhancement over Naive RAG that expands the user query with an LLM
 * before embedding-based retrieval. Stage adapters:
 *
 *   1. QueryExpansionAdapter   (new)   — LLM reformulates query for better retrieval
 *   2. (no pre-retrieval)
 *   3. NaiveRagRetrievalAdapter (reused) — vector similarity search in Qdrant
 *   4. (no post-retrieval)
 *   5. NaiveRagGenerationAdapter (reused) — OpenAI chat completion with context
 *
 * Reusing stages 3 and 5 from Naive RAG proves FR5 adapter reuse.
 *
 * @module core/techniques/simple-rag
 */

import OpenAI from 'openai';
import { providerRegistry } from '@wikirag/embeddings';
import { searchManager } from '@wikirag/qdrant';
import { techniqueRegistry } from '../../registry/technique-registry.js';
import type { Technique } from '../../types/technique.js';
import { NaiveRagRetrievalAdapter } from '../naive-rag/retrieval-adapter.js';
import { NaiveRagGenerationAdapter, DEFAULT_GENERATION_MODEL } from '../naive-rag/generation-adapter.js';
import { QueryExpansionAdapter } from './query-expansion-adapter.js';

/** Technique identifier used for registry lookups */
export const SIMPLE_RAG_NAME = 'simple-rag';

/**
 * Configuration for the Simple RAG technique factory.
 */
export interface SimpleRagConfig {
  /** OpenAI API key (defaults to process.env.OPENAI_API_KEY) */
  apiKey?: string;
  /** Embedding provider name registered in providerRegistry (default: 'openai') */
  embeddingProviderName?: string;
  /** Embedding provider config passed to providerRegistry.getProvider() */
  embeddingProviderConfig?: unknown;
  /** Chat model for query expansion and generation (default: gpt-4o-mini) */
  generationModel?: string;
}

/**
 * Create a Simple RAG Technique instance from the given configuration.
 *
 * Reuses NaiveRagRetrievalAdapter and NaiveRagGenerationAdapter unchanged,
 * adding only a query expansion step at Stage 1.
 *
 * @param config - Optional configuration overrides
 * @returns A fully-composed Technique ready for registration
 */
export function createSimpleRagTechnique(config: SimpleRagConfig = {}): Technique {
  const {
    apiKey = process.env.OPENAI_API_KEY,
    embeddingProviderName = 'openai',
    embeddingProviderConfig,
    generationModel = DEFAULT_GENERATION_MODEL,
  } = config;

  const resolvedEmbeddingConfig = embeddingProviderConfig ?? (
    embeddingProviderName === 'openai' ? { apiKey } : { model: embeddingProviderName }
  );
  const embeddingProvider = providerRegistry.getProvider(
    embeddingProviderName,
    resolvedEmbeddingConfig,
  );

  const openaiClient = new OpenAI({ apiKey });

  return {
    name: SIMPLE_RAG_NAME,
    description:
      'Simple RAG: LLM query expansion → vector similarity retrieval → OpenAI generation. ' +
      'Enhances Naive RAG by reformulating the user query before retrieval for better relevance.',
    adapters: {
      query: new QueryExpansionAdapter(openaiClient, generationModel),
      retrieval: new NaiveRagRetrievalAdapter(embeddingProvider, searchManager),
      generation: new NaiveRagGenerationAdapter(openaiClient, generationModel),
    },
  };
}

/**
 * Register the default Simple RAG technique with the shared registry.
 *
 * Call this once at application startup. The technique will be resolvable
 * as `techniqueRegistry.get('simple-rag')`.
 *
 * @param config - Optional configuration overrides
 */
export function registerSimpleRag(config: SimpleRagConfig = {}): void {
  if (techniqueRegistry.has(SIMPLE_RAG_NAME)) {
    return;
  }

  const technique = createSimpleRagTechnique(config);
  techniqueRegistry.register(technique);
}

/**
 * Standardized discovery entrypoint.
 *
 * Technique discovery calls this export automatically when present.
 */
export const registerTechnique = registerSimpleRag;

// Re-export adapter classes for consumers that want to compose their own pipelines
export { QueryExpansionAdapter } from './query-expansion-adapter.js';
