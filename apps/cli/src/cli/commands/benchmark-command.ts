/**
 * CLI command for benchmarking embedding providers
 *
 * Benchmarks registered embedding providers on throughput, latency, and memory usage.
 *
 * @module cli/commands/benchmark-command
 */

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { providerRegistry, runBenchmark } from '@wikirag/embeddings';
import type { BenchmarkResult } from '@wikirag/embeddings';
import { formatBenchmarkTable, formatBenchmarkResultsJson } from './benchmark-formatter.js';

/**
 * Built-in Wikipedia-style sample paragraphs for consistent benchmarking
 */
export const SAMPLE_PARAGRAPHS: string[] = [
  'The theory of general relativity, published by Albert Einstein in 1915, describes gravity not as a force but as a curvature of spacetime caused by mass and energy.',
  'The Python programming language was created by Guido van Rossum and first released in 1991. It emphasizes code readability and simplicity, allowing programmers to express concepts in fewer lines of code.',
  'The Amazon rainforest, also known as Amazonia, covers over 5.5 million square kilometers across nine countries in South America, representing over half of the planet\'s remaining rainforests.',
  'The human immune system is a complex network of cells, tissues, and organs that work together to defend the body against pathogens including bacteria, viruses, fungi, and parasites.',
  'Quantum computing harnesses quantum mechanical phenomena such as superposition and entanglement to perform computations. Unlike classical bits, quantum bits (qubits) can represent 0 and 1 simultaneously.',
  'The Renaissance was a period of European cultural, artistic, and intellectual rebirth that began in Italy during the 14th century and later spread across Europe, marking the transition from the Middle Ages to modernity.',
  'DNA, or deoxyribonucleic acid, is a molecule that carries the genetic instructions for the development, functioning, growth, and reproduction of all known organisms and many viruses.',
  'The Great Wall of China is a series of fortifications built across the northern borders of China, stretching over 21,000 kilometers in total. Construction began as early as the 7th century BC.',
  'Machine learning is a branch of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed, focusing on developing computer programs that can access data.',
  'The Pacific Ocean is the largest and deepest of the world\'s five oceanic divisions, covering more than 165 million square kilometers and reaching depths of over 11,000 meters in the Mariana Trench.',
];

/**
 * Default benchmark constants
 */
export const DEFAULT_ROUNDS = 5;
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_WARMUP_ROUNDS = 1;

/**
 * Benchmark command options
 */
export interface BenchmarkCommandOptions {
  /** Comma-separated provider names or 'all' */
  providers: string;
  /** Path to text file with sample paragraphs (one per line) */
  sampleFile?: string;
  /** Number of benchmark rounds */
  rounds: number;
  /** Texts per batch */
  batchSize: number;
  /** Output results as JSON */
  json?: boolean;
}

/**
 * Resolve provider-specific config from environment
 *
 * @param providerName - Registered provider name
 * @returns Provider configuration object
 */
export function resolveProviderConfig(providerName: string): unknown {
  switch (providerName) {
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'text-embedding-3-small',
      };
    default:
      // Ollama-based local provider
      return {
        model: providerName,
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      };
  }
}

/**
 * Load sample texts from a file (one paragraph per line)
 *
 * @param filePath - Path to text file
 * @returns Array of non-empty trimmed lines
 */
function loadSampleFile(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Resolve which providers to benchmark
 *
 * @param providersOption - 'all' or comma-separated list
 * @returns Array of provider names to benchmark
 */
function resolveProviders(providersOption: string): string[] {
  if (providersOption === 'all') {
    return providerRegistry.listProviders().map((p) => p.name);
  }
  return providersOption.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
}

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

/**
 * Create and configure the benchmark command
 *
 * @returns Configured Commander command
 */
export function createBenchmarkCommand(): Command {
  const command = new Command('benchmark');

  command
    .description('Benchmark embedding provider performance (throughput, latency, memory)')
    .option('--providers <list>', 'Comma-separated provider names or "all"', 'all')
    .option('--sample-file <path>', 'Text file with sample paragraphs (one per line)')
    .option('--rounds <n>', 'Number of benchmark rounds', (v) => parseInt(v, 10), DEFAULT_ROUNDS)
    .option('--batch-size <size>', 'Texts per batch per round', (v) => parseInt(v, 10), DEFAULT_BATCH_SIZE)
    .option('--json', 'Output results as JSON')
    .action(async (options: BenchmarkCommandOptions) => {
      try {
        validatePositiveInteger(options.rounds, '--rounds');
        validatePositiveInteger(options.batchSize, '--batch-size');

        // Resolve sample texts
        const sampleTexts = options.sampleFile
          ? loadSampleFile(options.sampleFile)
          : SAMPLE_PARAGRAPHS;

        if (sampleTexts.length === 0) {
          throw new Error('No sample texts available. Check your --sample-file path.');
        }

        // Resolve providers
        const providerNames = resolveProviders(options.providers);
        if (providerNames.length === 0) {
          throw new Error('No providers found. Check your --providers option.');
        }

        if (!options.json) {
          console.log('\n🔬 Embedding Provider Benchmark');
          console.log('═══════════════════════════════════════════════════');
          console.log(`Providers: ${providerNames.join(', ')}`);
          console.log(`Rounds: ${options.rounds} | Batch Size: ${options.batchSize} | Sample Texts: ${sampleTexts.length}`);
          console.log('═══════════════════════════════════════════════════\n');
        }

        // Run benchmarks sequentially
        const results: BenchmarkResult[] = [];
        const failures: string[] = [];

        for (const providerName of providerNames) {
          if (!options.json) {
            process.stdout.write(`⏳ Benchmarking ${providerName}...\n`);
            process.stdout.write(`  Warmup: ${DEFAULT_WARMUP_ROUNDS} round\n`);
            process.stdout.write(`  Benchmark: ${options.rounds} rounds × ${options.batchSize} texts = ${options.rounds * options.batchSize} embeddings\n`);
          }

          try {
            const config = resolveProviderConfig(providerName);
            const provider = providerRegistry.getProvider(providerName, config);

            const result = await runBenchmark(provider, {
              sampleTexts,
              warmupRounds: DEFAULT_WARMUP_ROUNDS,
              benchmarkRounds: options.rounds,
              batchSize: options.batchSize,
            });

            results.push(result);

            if (!options.json) {
              console.log(`  ✅ Complete: ${result.embeddingsPerSec.toFixed(1)} emb/sec\n`);
            }
          } catch (providerError) {
            const message = providerError instanceof Error ? providerError.message : String(providerError);
            failures.push(`${providerName}: ${message}`);
            if (!options.json) {
              console.error(`  ❌ Failed: ${message}\n`);
            }
          }
        }

        if (results.length === 0) {
          throw new Error('All providers failed. No results to display.');
        }

        // Output results
        if (options.json) {
          console.log(formatBenchmarkResultsJson(results));
          if (failures.length > 0) {
            console.error(`Benchmark failures: ${failures.join(' | ')}`);
          }
        } else {
          console.log('\n📊 Results');
          console.log(formatBenchmarkTable(results));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Error: ${message}\n`);
        process.exit(1);
      }
    });

  return command;
}
