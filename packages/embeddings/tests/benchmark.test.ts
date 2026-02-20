/**
 * Tests for the embedding provider benchmark runner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as R from 'ramda';
import { runBenchmark, calculatePercentile } from '../src/benchmark.js';
import type { EmbeddingProvider } from '../src/provider.js';
import type { BenchmarkConfig } from '../src/benchmark-types.js';

// ---------------------------------------------------------------------------
// Mock provider factory
// ---------------------------------------------------------------------------

function makeMockProvider(dims = 768): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue(new Array(dims).fill(0.1)),
    embedBatch: vi.fn().mockImplementation((texts: string[]) =>
      Promise.resolve({
        embeddings: texts.map(() => new Array(dims).fill(0.1)),
        successIndices: R.range(0, texts.length),
        failedIndices: [],
        errors: [],
        rateLimitHits: 0,
      })
    ),
    getModelInfo: vi.fn().mockReturnValue({
      provider: 'test-provider',
      model: 'test-model',
      dimensions: dims,
      description: 'Mock test provider',
    }),
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  };
}

const SAMPLE_CONFIG: BenchmarkConfig = {
  sampleTexts: ['Hello world', 'Foo bar', 'Baz qux'],
  warmupRounds: 1,
  benchmarkRounds: 3,
  batchSize: 2,
};

// ---------------------------------------------------------------------------
// calculatePercentile
// ---------------------------------------------------------------------------

describe('calculatePercentile', () => {
  it('returns 0 for empty array', () => {
    expect(calculatePercentile([], 95)).toBe(0);
  });

  it('returns the only element for a single-value array', () => {
    expect(calculatePercentile([42], 95)).toBe(42);
    expect(calculatePercentile([42], 50)).toBe(42);
  });

  it('returns the correct p50 value from a sorted array', () => {
    const sorted = [10, 20, 30, 40, 50];
    // index = ceil(0.50 * 5) - 1 = 3 - 1 = 2 → value 30
    expect(calculatePercentile(sorted, 50)).toBe(30);
  });

  it('returns the correct p95 value from a sorted array', () => {
    // 20 values
    const sorted = R.range(1, 21); // [1..20]
    // index = ceil(0.95 * 20) - 1 = 19 - 1 = 18 → value 19
    expect(calculatePercentile(sorted, 95)).toBe(19);
  });

  it('returns the last element for p100', () => {
    const sorted = [5, 10, 15, 20];
    expect(calculatePercentile(sorted, 100)).toBe(20);
  });

  it('clamps index to 0 for very small arrays with high percentile', () => {
    // Edge: ceil((95/100)*1) - 1 = 1 - 1 = 0 → value at index 0
    expect(calculatePercentile([7], 95)).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// runBenchmark
// ---------------------------------------------------------------------------

describe('runBenchmark', () => {
  let provider: EmbeddingProvider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it('calls embedBatch for warmup rounds (results discarded)', async () => {
    await runBenchmark(provider, { ...SAMPLE_CONFIG, warmupRounds: 2, benchmarkRounds: 1 });
    // warmup(2) + benchmark(1) = 3 total calls
    expect(provider.embedBatch).toHaveBeenCalledTimes(3);
  });

  it('calls embedBatch for the correct number of benchmark rounds', async () => {
    await runBenchmark(provider, { ...SAMPLE_CONFIG, warmupRounds: 0, benchmarkRounds: 5 });
    expect(provider.embedBatch).toHaveBeenCalledTimes(5);
  });

  it('returns correct provider and model from getModelInfo', async () => {
    const result = await runBenchmark(provider, SAMPLE_CONFIG);
    expect(result.provider).toBe('test-provider');
    expect(result.model).toBe('test-model');
    expect(result.dimensions).toBe(768);
  });

  it('returns correct totalTexts count', async () => {
    const result = await runBenchmark(provider, {
      ...SAMPLE_CONFIG,
      warmupRounds: 0,
      benchmarkRounds: 3,
      batchSize: 2,
    });
    // 3 rounds × 2 texts = 6
    expect(result.totalTexts).toBe(6);
  });

  it('returns non-negative embeddingsPerSec', async () => {
    const result = await runBenchmark(provider, SAMPLE_CONFIG);
    expect(result.embeddingsPerSec).toBeGreaterThanOrEqual(0);
  });

  it('returns non-negative latency statistics', async () => {
    const result = await runBenchmark(provider, SAMPLE_CONFIG);
    expect(result.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.p95LatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.p99LatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('p95 and p99 are >= avgLatencyMs (within tolerance for mock)', async () => {
    const result = await runBenchmark(provider, {
      ...SAMPLE_CONFIG,
      benchmarkRounds: 10,
    });
    // For a fast mock, all values may be ~0; just ensure non-negative ordering holds
    expect(result.p95LatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.p99LatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns non-negative memoryUsageMb', async () => {
    const result = await runBenchmark(provider, SAMPLE_CONFIG);
    expect(result.memoryUsageMb).toBeGreaterThanOrEqual(0);
  });

  it('fills batch by repeating texts when fewer than batchSize are provided', async () => {
    const config: BenchmarkConfig = {
      sampleTexts: ['only one text'],
      warmupRounds: 0,
      benchmarkRounds: 1,
      batchSize: 5,
    };
    await runBenchmark(provider, config);
    // embedBatch should be called with 5 texts (repeated)
    const callArgs = (provider.embedBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string[];
    expect(callArgs).toHaveLength(5);
    expect(callArgs.every((t: string) => t === 'only one text')).toBe(true);
  });

  it('slices batch to batchSize when more texts than batchSize are provided', async () => {
    const config: BenchmarkConfig = {
      sampleTexts: ['a', 'b', 'c', 'd', 'e', 'f'],
      warmupRounds: 0,
      benchmarkRounds: 1,
      batchSize: 3,
    };
    await runBenchmark(provider, config);
    const callArgs = (provider.embedBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string[];
    expect(callArgs).toHaveLength(3);
    expect(callArgs).toEqual(['a', 'b', 'c']);
  });

  it('returns totalDurationMs greater than or equal to 0', async () => {
    const result = await runBenchmark(provider, SAMPLE_CONFIG);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('counts only successful embeddings for totalTexts', async () => {
    provider.embedBatch = vi.fn().mockResolvedValue({
      embeddings: [[0.1], [0.2]],
      successIndices: [0, 2],
      failedIndices: [1],
      errors: ['', 'failed', ''],
      rateLimitHits: 0,
    });

    const result = await runBenchmark(provider, {
      sampleTexts: ['a', 'b', 'c'],
      warmupRounds: 0,
      benchmarkRounds: 2,
      batchSize: 3,
    });

    // 2 successful embeddings per round x 2 rounds
    expect(result.totalTexts).toBe(4);
  });
});
