/**
 * Shared pipeline context types
 *
 * Defines the data shapes flowing through every stage of the RAG pipeline.
 *
 * @module core/types/pipeline-context
 */

/**
 * A single document retrieved from the vector store.
 * Carries the text content, relevance score, and arbitrary metadata.
 */
export interface RetrievedDocument {
  /** Unique document identifier (Qdrant point id) */
  id: string | number;
  /** Semantic similarity score (higher = more relevant) */
  score: number;
  /** Primary text content of the document */
  content: string;
  /** Arbitrary metadata stored alongside the vector (e.g., article title, section) */
  metadata: Record<string, unknown>;
}

/**
 * Configuration passed into every pipeline execution.
 * Techniques may extend this with their own fields.
 */
export interface PipelineConfig {
  /** Maximum number of documents to retrieve */
  topK: number;
  /** Optional minimum similarity score threshold */
  scoreThreshold?: number;
  /** Name of the Qdrant collection to search */
  collectionName: string;
  /** Arbitrary extra settings for specific techniques or adapters */
  [key: string]: unknown;
}

/**
 * Mutable context object passed sequentially through all pipeline stages.
 *
 * Each adapter reads from and writes to this object, progressively enriching it.
 * Stages communicate exclusively via PipelineContext — no direct coupling.
 */
export interface PipelineContext {
  /** Original raw query from the end user */
  query: string;
  /** Transformed query after QueryAdapter (may be string or richer object) */
  processedQuery?: string | Record<string, unknown>;
  /** Retrieval-ready representation after PreRetrievalAdapter */
  retrievalQuery?: string | number[];
  /** Documents fetched by RetrievalAdapter */
  retrievedDocuments?: RetrievedDocument[];
  /** Refined/re-ranked documents after PostRetrievalAdapter */
  refinedDocuments?: RetrievedDocument[];
  /** Final generated response text */
  response?: string;
  /** Pipeline execution configuration */
  config: PipelineConfig;
  /** Arbitrary key-value bag for inter-adapter communication */
  metadata: Record<string, unknown>;
}
