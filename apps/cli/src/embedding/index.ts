/**
 * Embedding generation and Qdrant insertion module
 *
 * Provides complete pipeline for:
 * - Embedding generation via pluggable providers
 * - Batch processing for efficiency
 * - Qdrant vector insertion
 * - Progress tracking and metrics
 *
 * @packageDocumentation
 */

// Main pipeline orchestrator
export { EmbeddingPipeline } from './pipeline.js';

// Component classes
export { BatchProcessor } from './batch-processor.js';
export { QdrantInserter } from './qdrant-inserter.js';

// Type definitions
export type {
  ParsedParagraph,
  EmbeddedParagraph,
  WikipediaPayload,
  EmbeddingConfig,
  QdrantInsertConfig,
  EmbeddingMetrics,
  BatchEmbeddingResult,
  PipelineConfig,
} from './types.js';

// Error classes
export {
  EmbeddingError,
  QdrantInsertError,
  BatchProcessingError,
} from './errors.js';
