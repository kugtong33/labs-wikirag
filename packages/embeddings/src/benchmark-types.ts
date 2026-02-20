/**
 * Type definitions for provider benchmarking and quality comparison
 *
 * @module embeddings/benchmark-types
 */

/**
 * Configuration for a benchmark run
 */
export interface BenchmarkConfig {
  /** Sample texts to use for embedding generation */
  sampleTexts: string[];
  /** Number of warmup rounds to run before timing (results discarded) */
  warmupRounds: number;
  /** Number of timed benchmark rounds */
  benchmarkRounds: number;
  /** Number of texts per batch per round */
  batchSize: number;
}

/**
 * Performance and quality metrics from a single provider benchmark run
 */
export interface BenchmarkResult {
  /** Provider name (e.g., 'openai', 'nomic-embed-text') */
  provider: string;
  /** Model identifier */
  model: string;
  /** Embedding vector dimensions */
  dimensions: number;
  /** Throughput: embeddings generated per second */
  embeddingsPerSec: number;
  /** Average per-batch latency in milliseconds */
  avgLatencyMs: number;
  /** 95th-percentile per-batch latency in milliseconds */
  p95LatencyMs: number;
  /** 99th-percentile per-batch latency in milliseconds */
  p99LatencyMs: number;
  /** Memory delta during benchmark in megabytes (heap used after − before) */
  memoryUsageMb: number;
  /** Total number of embeddings generated across all rounds */
  totalTexts: number;
  /** Total wall-clock duration of benchmark phase in milliseconds */
  totalDurationMs: number;
}

/**
 * A single retrieved result in a quality comparison
 */
export interface QualityResult {
  /** Rank position (1-based) */
  rank: number;
  /** Vector similarity score */
  score: number;
  /** Article title */
  title: string;
  /** Article text snippet */
  text: string;
}

/**
 * Quality comparison result for one provider against a query
 */
export interface QualityComparisonResult {
  /** Provider name */
  provider: string;
  /** Query text used */
  query: string;
  /** Ranked retrieval results */
  results: QualityResult[];
  /** Estimated precision (fraction of results judged relevant) */
  precision: number;
  /** Estimated recall (fraction of relevant docs retrieved) */
  recall: number;
  /** Average relevance score across top-k results */
  relevance: number;
}
