/**
 * Naive RAG technique
 *
 * Creates and registers the Naive RAG technique with the global
 * technique registry. Naive RAG is the simplest RAG strategy:
 *
 *   1. Passthrough query (no transformation)
 *   2. (no pre-retrieval)
 *   3. Vector similarity retrieval from Qdrant
 *   4. (no post-retrieval)
 *   5. OpenAI chat completion with retrieved context
 *
 * @module core/techniques/naive-rag
 */

import OpenAI from 'openai';
import { providerRegistry } from '@wikirag/embeddings';
import { searchManager } from '@wikirag/qdrant';
import { techniqueRegistry } from '../../registry/technique-registry.js';
import type { Technique } from '../../types/technique.js';
import { PassthroughQueryAdapter } from './query-adapter.js';
import { NaiveRagRetrievalAdapter } from './retrieval-adapter.js';
import { NaiveRagGenerationAdapter, DEFAULT_GENERATION_MODEL } from './generation-adapter.js';

/** Technique identifier used for registry lookups */
export const NAIVE_RAG_NAME = 'naive-rag';

/**
 * Configuration for the Naive RAG technique factory.
 */
export interface NaiveRagConfig {
  /** OpenAI API key (defaults to process.env.OPENAI_API_KEY) */
  apiKey?: string;
  /** Embedding provider name registered in providerRegistry (default: 'openai') */
  embeddingProviderName?: string;
  /** Embedding provider config passed to providerRegistry.getProvider() */
  embeddingProviderConfig?: unknown;
  /** Chat model for generation (default: gpt-4o-mini) */
  generationModel?: string;
}

/**
 * Create a Naive RAG Technique instance from the given configuration.
 *
 * Adapters are created with dependency injection so they can be tested
 * independently or overridden in different deployment contexts.
 *
 * @param config - Optional configuration overrides
 * @returns A fully-composed Technique ready for registration
 */
export function createNaiveRagTechnique(config: NaiveRagConfig = {}): Technique {
  const {
    apiKey = process.env.OPENAI_API_KEY,
    embeddingProviderName = 'openai',
    embeddingProviderConfig,
    generationModel = DEFAULT_GENERATION_MODEL,
  } = config;

  // Resolve embedding provider from the shared registry
  const resolvedEmbeddingConfig = embeddingProviderConfig ?? (
    embeddingProviderName === 'openai' ? { apiKey } : { model: embeddingProviderName }
  );
  const embeddingProvider = providerRegistry.getProvider(
    embeddingProviderName,
    resolvedEmbeddingConfig,
  );

  // OpenAI client for generation
  const openaiClient = new OpenAI({ apiKey });

  return {
    name: NAIVE_RAG_NAME,
    description:
      'Naive RAG: passthrough query → vector similarity retrieval → OpenAI generation. ' +
      'The simplest retrieve-then-generate approach with no query expansion or re-ranking.',
    adapters: {
      query: new PassthroughQueryAdapter(),
      retrieval: new NaiveRagRetrievalAdapter(embeddingProvider, searchManager),
      generation: new NaiveRagGenerationAdapter(openaiClient, generationModel),
    },
  };
}

// Re-export adapter classes for consumers that want to compose their own pipelines
export { PassthroughQueryAdapter } from './query-adapter.js';
export { NaiveRagRetrievalAdapter } from './retrieval-adapter.js';
export { NaiveRagGenerationAdapter, DEFAULT_GENERATION_MODEL } from './generation-adapter.js';

/**
 * Register the default Naive RAG technique with the shared registry.
 *
 * Call this once at application startup (e.g., in apps/api/src/index.ts).
 * The technique will be resolvable as `techniqueRegistry.get('naive-rag')`.
 *
 * @param config - Optional configuration overrides
 */
export function registerNaiveRag(config: NaiveRagConfig = {}): void {
  if (techniqueRegistry.has(NAIVE_RAG_NAME)) {
    return;
  }

  const technique = createNaiveRagTechnique(config);
  techniqueRegistry.register(technique);
}

/**
 * Standardized discovery entrypoint.
 *
 * Technique discovery calls this export automatically when present.
 */
export const registerTechnique = registerNaiveRag;
