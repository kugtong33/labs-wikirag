/**
 * Benchmark result formatting utilities
 *
 * Formats BenchmarkResult arrays as console tables or JSON output.
 *
 * @module cli/commands/benchmark-formatter
 */

import * as R from 'ramda';
import type { BenchmarkResult } from '@wikirag/embeddings';

/**
 * Column widths for the aligned console table
 */
const COL_PROVIDER = 18;
const COL_MODEL = 22;
const COL_DIMS = 6;
const COL_EMBSEC = 10;
const COL_AVG = 10;
const COL_P95 = 10;
const COL_P99 = 10;
const COL_MEM = 9;

/** Pad a string to a fixed width (left-align) */
const padLeft = (width: number, value: string): string =>
  value.length >= width ? value.slice(0, width) : value + ' '.repeat(width - value.length);

/** Pad a number to a fixed width (right-align) */
const padRight = (width: number, value: string): string =>
  value.length >= width ? value.slice(0, width) : ' '.repeat(width - value.length) + value;

/**
 * Format a single BenchmarkResult row for the table body
 */
const formatRow = (r: BenchmarkResult): string => {
  const cells = [
    padLeft(COL_PROVIDER, r.provider),
    padLeft(COL_MODEL, r.model),
    padRight(COL_DIMS, String(r.dimensions)),
    padRight(COL_EMBSEC, r.embeddingsPerSec.toFixed(1)),
    padRight(COL_AVG, r.avgLatencyMs.toFixed(1)),
    padRight(COL_P95, r.p95LatencyMs.toFixed(1)),
    padRight(COL_P99, r.p99LatencyMs.toFixed(1)),
    padRight(COL_MEM, r.memoryUsageMb.toFixed(1)),
  ];
  return `│ ${cells.join(' │ ')} │`;
};

/**
 * Build the table header row
 */
const buildHeader = (): string => {
  const cells = [
    padLeft(COL_PROVIDER, 'Provider'),
    padLeft(COL_MODEL, 'Model'),
    padRight(COL_DIMS, 'Dims'),
    padRight(COL_EMBSEC, 'Emb/sec'),
    padRight(COL_AVG, 'Avg (ms)'),
    padRight(COL_P95, 'P95 (ms)'),
    padRight(COL_P99, 'P99 (ms)'),
    padRight(COL_MEM, 'Mem MB'),
  ];
  return `│ ${cells.join(' │ ')} │`;
};

/**
 * Build a horizontal divider line
 *
 * @param left - Left border character
 * @param mid - Middle intersection character
 * @param right - Right border character
 * @param fill - Fill character
 */
const buildDivider = (left: string, mid: string, right: string, fill: string): string => {
  const widths = [COL_PROVIDER, COL_MODEL, COL_DIMS, COL_EMBSEC, COL_AVG, COL_P95, COL_P99, COL_MEM];
  const segments = widths.map((w) => fill.repeat(w + 2));
  return left + segments.join(mid) + right;
};

/**
 * Format benchmark results as an aligned console table, sorted by emb/sec descending
 *
 * @param results - Benchmark results to format
 * @returns Multi-line string table
 */
export function formatBenchmarkTable(results: BenchmarkResult[]): string {
  if (results.length === 0) return '(no results)';

  const sorted = R.sort(R.descend(R.prop('embeddingsPerSec')), results);

  const top = buildDivider('┌', '┬', '┐', '─');
  const headerSep = buildDivider('├', '┼', '┤', '─');
  const bottom = buildDivider('└', '┴', '┘', '─');

  const lines = [
    top,
    buildHeader(),
    headerSep,
    ...R.map(formatRow, sorted),
    bottom,
  ];

  return lines.join('\n');
}

/**
 * Format benchmark results as compact JSON string
 *
 * @param results - Benchmark results to format
 * @returns JSON string
 */
export function formatBenchmarkResultsJson(results: BenchmarkResult[]): string {
  const sorted = R.sort(R.descend(R.prop('embeddingsPerSec')), results);
  return JSON.stringify(sorted, null, 2);
}
