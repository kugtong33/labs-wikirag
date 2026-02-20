/**
 * @wikirag/core
 *
 * Core abstractions for the WikiRAG pipeline:
 * - Stage adapter interfaces (query, pre-retrieval, retrieval, post-retrieval, generation)
 * - Shared pipeline context types
 * - Technique type and composition
 * - Technique registry
 *
 * @module core
 */

// Pipeline context and shared types
export type {
  PipelineContext,
  PipelineConfig,
  RetrievedDocument,
} from './types/pipeline-context.js';

// Stage adapter interfaces
export type { QueryAdapter } from './types/query-adapter.js';
export type { PreRetrievalAdapter } from './types/pre-retrieval-adapter.js';
export type { RetrievalAdapter } from './types/retrieval-adapter.js';
export type { PostRetrievalAdapter } from './types/post-retrieval-adapter.js';
export type { GenerationAdapter } from './types/generation-adapter.js';

// Technique types
export type { Technique, TechniqueComposition } from './types/technique.js';

// Technique registry
export {
  TechniqueRegistry,
  TechniqueRegistryError,
  techniqueRegistry,
} from './registry/technique-registry.js';
