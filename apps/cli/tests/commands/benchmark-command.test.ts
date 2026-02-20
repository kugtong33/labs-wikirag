/**
 * Tests for the benchmark CLI command
 */

import { describe, it, expect } from 'vitest';
import {
  createBenchmarkCommand,
  SAMPLE_PARAGRAPHS,
  DEFAULT_ROUNDS,
  DEFAULT_BATCH_SIZE,
  resolveProviderConfig,
} from '../../src/cli/commands/benchmark-command.js';
import { formatBenchmarkTable, formatBenchmarkResultsJson } from '../../src/cli/commands/benchmark-formatter.js';
import { extractProviderFromCollection } from '../../src/cli/commands/quality-command.js';
import type { BenchmarkResult } from '@wikirag/embeddings';

// ---------------------------------------------------------------------------
// benchmark-command structure
// ---------------------------------------------------------------------------

describe('createBenchmarkCommand', () => {
  it('creates a command with name "benchmark"', () => {
    const command = createBenchmarkCommand();
    expect(command.name()).toBe('benchmark');
  });

  it('has --providers option with default "all"', () => {
    const command = createBenchmarkCommand();
    const opt = command.options.find((o) => o.long === '--providers');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe('all');
  });

  it('has --rounds option with correct default', () => {
    const command = createBenchmarkCommand();
    const opt = command.options.find((o) => o.long === '--rounds');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe(DEFAULT_ROUNDS);
  });

  it('has --batch-size option with correct default', () => {
    const command = createBenchmarkCommand();
    const opt = command.options.find((o) => o.long === '--batch-size');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe(DEFAULT_BATCH_SIZE);
  });

  it('has --sample-file option', () => {
    const command = createBenchmarkCommand();
    const opt = command.options.find((o) => o.long === '--sample-file');
    expect(opt).toBeDefined();
  });

  it('has --json flag', () => {
    const command = createBenchmarkCommand();
    const opt = command.options.find((o) => o.long === '--json');
    expect(opt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SAMPLE_PARAGRAPHS
// ---------------------------------------------------------------------------

describe('SAMPLE_PARAGRAPHS', () => {
  it('contains at least 5 built-in paragraphs', () => {
    expect(SAMPLE_PARAGRAPHS.length).toBeGreaterThanOrEqual(5);
  });

  it('all paragraphs are non-empty strings', () => {
    SAMPLE_PARAGRAPHS.forEach((p) => {
      expect(typeof p).toBe('string');
      expect(p.trim().length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// resolveProviderConfig
// ---------------------------------------------------------------------------

describe('resolveProviderConfig', () => {
  it('returns apiKey and model for openai provider', () => {
    const config = resolveProviderConfig('openai') as Record<string, unknown>;
    expect(config).toHaveProperty('model', 'text-embedding-3-small');
    expect(config).toHaveProperty('apiKey');
  });

  it('returns model and baseUrl for unknown (Ollama) providers', () => {
    const config = resolveProviderConfig('nomic-embed-text') as Record<string, unknown>;
    expect(config).toHaveProperty('model', 'nomic-embed-text');
    expect(config).toHaveProperty('baseUrl');
  });

  it('uses OLLAMA_BASE_URL env var when set', () => {
    process.env.OLLAMA_BASE_URL = 'http://custom-host:11434';
    const config = resolveProviderConfig('qwen3-embedding') as Record<string, unknown>;
    expect(config).toHaveProperty('baseUrl', 'http://custom-host:11434');
    delete process.env.OLLAMA_BASE_URL;
  });
});

// ---------------------------------------------------------------------------
// benchmark-formatter
// ---------------------------------------------------------------------------

const MOCK_RESULT: BenchmarkResult = {
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  embeddingsPerSec: 125.3,
  avgLatencyMs: 79.8,
  p95LatencyMs: 112.4,
  p99LatencyMs: 130.0,
  memoryUsageMb: 12.3,
  totalTexts: 50,
  totalDurationMs: 399,
};

const MOCK_RESULT_2: BenchmarkResult = {
  provider: 'nomic-embed-text',
  model: 'nomic-embed-text',
  dimensions: 768,
  embeddingsPerSec: 45.2,
  avgLatencyMs: 221.4,
  p95LatencyMs: 298.1,
  p99LatencyMs: 320.0,
  memoryUsageMb: 156.7,
  totalTexts: 50,
  totalDurationMs: 1107,
};

describe('formatBenchmarkTable', () => {
  it('returns a non-empty string for a single result', () => {
    const table = formatBenchmarkTable([MOCK_RESULT]);
    expect(typeof table).toBe('string');
    expect(table.length).toBeGreaterThan(0);
  });

  it('includes provider name in table output', () => {
    const table = formatBenchmarkTable([MOCK_RESULT]);
    expect(table).toContain('openai');
  });

  it('sorts results by embeddingsPerSec descending', () => {
    const table = formatBenchmarkTable([MOCK_RESULT_2, MOCK_RESULT]);
    const openaiPos = table.indexOf('openai');
    const nomicPos = table.indexOf('nomic-embed-text');
    // openai (125.3 emb/sec) should appear before nomic-embed-text (45.2 emb/sec)
    expect(openaiPos).toBeLessThan(nomicPos);
  });

  it('returns "(no results)" for empty array', () => {
    expect(formatBenchmarkTable([])).toBe('(no results)');
  });
});

describe('formatBenchmarkResultsJson', () => {
  it('returns valid JSON string', () => {
    const json = formatBenchmarkResultsJson([MOCK_RESULT]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('JSON output contains all result fields', () => {
    const json = formatBenchmarkResultsJson([MOCK_RESULT]);
    const parsed = JSON.parse(json) as BenchmarkResult[];
    expect(parsed[0].provider).toBe('openai');
    expect(parsed[0].embeddingsPerSec).toBe(125.3);
    expect(parsed[0].dimensions).toBe(1536);
  });

  it('sorts results by embeddingsPerSec descending in JSON output', () => {
    const json = formatBenchmarkResultsJson([MOCK_RESULT_2, MOCK_RESULT]);
    const parsed = JSON.parse(json) as BenchmarkResult[];
    expect(parsed[0].provider).toBe('openai');
    expect(parsed[1].provider).toBe('nomic-embed-text');
  });
});

// ---------------------------------------------------------------------------
// extractProviderFromCollection (quality-command helper)
// ---------------------------------------------------------------------------

describe('extractProviderFromCollection', () => {
  it('extracts "openai" from wiki-paragraph-openai-20260215', () => {
    expect(extractProviderFromCollection('wiki-paragraph-openai-20260215')).toBe('openai');
  });

  it('extracts "nomic-embed-text" from wiki-paragraph-nomic-embed-text-20260215', () => {
    expect(extractProviderFromCollection('wiki-paragraph-nomic-embed-text-20260215')).toBe('nomic-embed-text');
  });

  it('extracts "qwen3-embedding" from wiki-paragraph-qwen3-embedding-20260215', () => {
    expect(extractProviderFromCollection('wiki-paragraph-qwen3-embedding-20260215')).toBe('qwen3-embedding');
  });

  it('handles collection names without wiki- prefix gracefully', () => {
    // No 'wiki-' prefix: strip date, strip first segment
    const result = extractProviderFromCollection('paragraph-openai-20260215');
    expect(result).toBe('openai');
  });

  it('handles collection names without date suffix gracefully', () => {
    const result = extractProviderFromCollection('wiki-paragraph-openai');
    expect(result).toBe('openai');
  });
});
