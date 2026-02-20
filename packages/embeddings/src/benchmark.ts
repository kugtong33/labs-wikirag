/**
 * Embedding provider benchmark runner
 *
 * @module embeddings/benchmark
 */

import * as R from 'ramda';
import type { EmbeddingProvider } from './provider.js';
import type { BenchmarkConfig, BenchmarkResult } from './benchmark-types.js';

/**
 * Calculate a percentile value from a pre-sorted array
 *
 * @param sortedValues - Array sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns Value at the given percentile, or 0 for empty arrays
 */
export const calculatePercentile = (sortedValues: number[], percentile: number): number => {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return R.nth(Math.max(0, index), sortedValues) ?? 0;
};

/**
 * Run a performance benchmark against an embedding provider
 *
 * Executes warmup rounds (to load models into memory / prime caches), then
 * timed benchmark rounds. Collects per-batch latencies and calculates
 * throughput, latency percentiles, and heap memory delta.
 *
 * @param provider - Embedding provider to benchmark
 * @param config - Benchmark configuration
 * @returns Benchmark result with performance metrics
 *
 * @example
 * ```typescript
 * const result = await runBenchmark(provider, {
 *   sampleTexts: ['Hello world', 'Another text'],
 *   warmupRounds: 1,
 *   benchmarkRounds: 5,
 *   batchSize: 10,
 * });
 * console.log(`${result.embeddingsPerSec.toFixed(1)} emb/sec`);
 * ```
 */
export async function runBenchmark(
  provider: EmbeddingProvider,
  config: BenchmarkConfig
): Promise<BenchmarkResult> {
  const { sampleTexts, warmupRounds, benchmarkRounds, batchSize } = config;
  const modelInfo = provider.getModelInfo();

  // Take at most batchSize texts per round; repeat if fewer provided
  const batch = sampleTexts.length >= batchSize
    ? sampleTexts.slice(0, batchSize)
    : R.times((i) => sampleTexts[i % sampleTexts.length], batchSize);

  // --- Warmup phase (results discarded) ---
  for (let i = 0; i < warmupRounds; i++) {
    await provider.embedBatch(batch);
  }

  // --- Timed benchmark phase ---
  const memBefore = process.memoryUsage().heapUsed;
  const batchLatencies: number[] = [];
  let totalTexts = 0;
  const phaseStart = Date.now();

  for (let i = 0; i < benchmarkRounds; i++) {
    const batchStart = Date.now();
    await provider.embedBatch(batch);
    batchLatencies.push(Date.now() - batchStart);
    totalTexts += batch.length;
  }

  const totalDurationMs = Date.now() - phaseStart;
  const memAfter = process.memoryUsage().heapUsed;
  const memoryUsageMb = Math.max(0, (memAfter - memBefore) / 1024 / 1024);

  // --- Latency statistics ---
  const sortedLatencies = R.sort(R.subtract, batchLatencies);
  const avgLatencyMs = R.isEmpty(batchLatencies) ? 0 : R.mean(batchLatencies);
  const p95LatencyMs = calculatePercentile(sortedLatencies, 95);
  const p99LatencyMs = calculatePercentile(sortedLatencies, 99);

  const embeddingsPerSec = totalDurationMs > 0
    ? totalTexts / (totalDurationMs / 1000)
    : 0;

  return {
    provider: modelInfo.provider,
    model: modelInfo.model,
    dimensions: modelInfo.dimensions,
    embeddingsPerSec,
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    memoryUsageMb,
    totalTexts,
    totalDurationMs,
  };
}
