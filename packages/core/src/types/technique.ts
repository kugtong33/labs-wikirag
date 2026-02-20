/**
 * Technique type definitions
 *
 * A Technique is a named composition of stage adapters that implements
 * one complete RAG strategy. The query and retrieval/generation adapters
 * are required; pre/post-retrieval adapters are optional.
 *
 * @module core/types/technique
 */

import type { QueryAdapter } from './query-adapter.js';
import type { PreRetrievalAdapter } from './pre-retrieval-adapter.js';
import type { RetrievalAdapter } from './retrieval-adapter.js';
import type { PostRetrievalAdapter } from './post-retrieval-adapter.js';
import type { GenerationAdapter } from './generation-adapter.js';

/**
 * The concrete set of adapter instances that implement each pipeline stage
 * for one RAG technique.
 */
export interface TechniqueComposition {
  /** Stage 1: query transformation (required) */
  query: QueryAdapter;
  /** Stage 2: pre-retrieval query preparation (optional) */
  preRetrieval?: PreRetrievalAdapter;
  /** Stage 3: document retrieval (required) */
  retrieval: RetrievalAdapter;
  /** Stage 4: post-retrieval refinement (optional) */
  postRetrieval?: PostRetrievalAdapter;
  /** Stage 5: response generation (required) */
  generation: GenerationAdapter;
}

/**
 * A named, self-describing RAG technique.
 *
 * Register instances with `techniqueRegistry.register(technique)`.
 * The registry resolves techniques by name at query time.
 */
export interface Technique {
  /** Unique technique identifier (e.g., 'naive-rag', 'corrective-rag') */
  readonly name: string;
  /** Human-readable description shown in the UI technique selector */
  readonly description: string;
  /** Adapter instances that implement this technique's pipeline stages */
  readonly adapters: TechniqueComposition;
}
