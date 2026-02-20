/**
 * CLI command for comparing retrieval quality across embedding providers
 *
 * Queries multiple Qdrant collections (each indexed with a different provider)
 * and displays side-by-side retrieval results to help evaluate provider quality.
 *
 * @module cli/commands/quality-command
 */

import * as R from 'ramda';
import { Command } from 'commander';
import { searchManager } from '@wikirag/qdrant';
import { providerRegistry } from '@wikirag/embeddings';
import type { QualityResult, QualityComparisonResult } from '@wikirag/embeddings';

/**
 * Default number of top results to retrieve per collection
 */
export const DEFAULT_TOP_K = 5;

/**
 * Quality command options
 */
export interface QualityCommandOptions {
  /** Search query text */
  query: string;
  /** Comma-separated Qdrant collection names */
  collections: string;
  /** Number of results per collection */
  topK: number;
}

/**
 * Extract the embedding provider name from a collection name
 *
 * Collection naming convention: wiki-{strategy}-{provider}-{date}
 * Examples:
 *   wiki-paragraph-openai-20260215          → 'openai'
 *   wiki-paragraph-nomic-embed-text-20260215 → 'nomic-embed-text'
 *   wiki-paragraph-qwen3-embedding-20260215  → 'qwen3-embedding'
 *
 * Strategy: strip 'wiki-', then strip '-{8-digit-date}' suffix, then strip '{strategy}-' prefix.
 *
 * @param collectionName - Qdrant collection name
 * @returns Extracted provider name, or the full name if it cannot be parsed
 */
export function extractProviderFromCollection(collectionName: string): string {
  // Strip leading 'wiki-'
  const withoutPrefix = collectionName.startsWith('wiki-')
    ? collectionName.slice('wiki-'.length)
    : collectionName;

  // Strip trailing '-{YYYYMMDD}' date suffix
  const withoutDate = withoutPrefix.replace(/-\d{8}$/, '');

  // Strip leading strategy segment (first dash-separated token)
  const dashIndex = withoutDate.indexOf('-');
  if (dashIndex === -1) return withoutDate;

  return withoutDate.slice(dashIndex + 1);
}

/**
 * Resolve provider config from environment for a given provider name
 */
function resolveConfig(providerName: string): unknown {
  switch (providerName) {
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'text-embedding-3-small',
      };
    default:
      return {
        model: providerName,
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      };
  }
}

/**
 * Calculate simple relevance metrics from scored results
 *
 * Uses a threshold of 0.5 as a naive "relevant" cutoff.
 * Precision = fraction of top-k results above threshold.
 * Recall is estimated as precision (no ground truth available).
 * Relevance = mean score across all results.
 *
 * @param scores - Array of similarity scores
 * @returns precision, recall, relevance
 */
function calculateMetrics(scores: number[]): { precision: number; recall: number; relevance: number } {
  if (scores.length === 0) return { precision: 0, recall: 0, relevance: 0 };
  const RELEVANCE_THRESHOLD = 0.5;
  const relevantCount = scores.filter((s) => s >= RELEVANCE_THRESHOLD).length;
  const precision = relevantCount / scores.length;
  const recall = precision; // estimated — no ground-truth labels available
  const relevance = R.mean(scores);
  return { precision, recall, relevance };
}

/**
 * Run a quality comparison query against a single collection
 *
 * @param collectionName - Qdrant collection name
 * @param query - Query text
 * @param topK - Number of results
 * @returns QualityComparisonResult
 */
async function compareCollection(
  collectionName: string,
  query: string,
  topK: number
): Promise<QualityComparisonResult> {
  const providerName = extractProviderFromCollection(collectionName);

  // Generate query embedding using the collection's provider
  const config = resolveConfig(providerName);
  const provider = providerRegistry.getProvider(providerName, config);
  const queryEmbedding = await provider.embed(query);

  // Search Qdrant
  const searchResults = await searchManager.similaritySearch(collectionName, queryEmbedding, topK);

  // Map to QualityResult
  const results: QualityResult[] = searchResults.map((sr, idx) => ({
    rank: idx + 1,
    score: sr.score,
    title: sr.payload.articleTitle,
    text: [sr.payload.sectionName, `(para ${sr.payload.paragraphPosition})`]
      .filter(Boolean)
      .join(' '),
  }));

  const scores = results.map((r) => r.score);
  const { precision, recall, relevance } = calculateMetrics(scores);

  return { provider: providerName, query, results, precision, recall, relevance };
}

/**
 * Calculate result overlap (titles shared between two result sets)
 */
function calculateOverlap(a: QualityResult[], b: QualityResult[]): number {
  const titlesA = new Set(a.map((r) => r.title));
  return b.filter((r) => titlesA.has(r.title)).length;
}

/**
 * Display a single quality comparison result to stdout
 */
function displayComparison(comparison: QualityComparisonResult): void {
  console.log(`\nProvider: ${comparison.provider} (collection query)`);
  comparison.results.forEach((r) => {
    console.log(`  ${r.rank}. [${r.score.toFixed(2)}] ${r.title}${r.text ? ` — ${r.text}` : ''}`);
  });
  console.log(`  Precision: ${(comparison.precision * 100).toFixed(0)}% | Recall: ${(comparison.recall * 100).toFixed(0)}% | Avg Score: ${comparison.relevance.toFixed(3)}`);
}

/**
 * Create and configure the quality comparison command
 *
 * @returns Configured Commander command
 */
export function createQualityCommand(): Command {
  const command = new Command('quality');

  command
    .description('Compare retrieval quality across Qdrant collections indexed with different providers')
    .requiredOption('--query <text>', 'Search query text')
    .requiredOption('--collections <list>', 'Comma-separated Qdrant collection names to compare')
    .option('--top-k <n>', 'Number of results per collection', (v) => parseInt(v, 10), DEFAULT_TOP_K)
    .action(async (options: QualityCommandOptions) => {
      try {
        const collectionNames = options.collections
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        if (collectionNames.length === 0) {
          throw new Error('No collections specified. Use --collections <list>.');
        }

        console.log(`\n🔍 Quality Comparison`);
        console.log('═══════════════════════════════════════════════════');
        console.log(`Query: "${options.query}"`);
        console.log(`Collections: ${collectionNames.join(', ')}`);
        console.log(`Top-K: ${options.topK}`);
        console.log('═══════════════════════════════════════════════════');

        const comparisons: QualityComparisonResult[] = [];

        for (const collectionName of collectionNames) {
          const providerName = extractProviderFromCollection(collectionName);
          process.stdout.write(`\n⏳ Querying ${collectionName} (provider: ${providerName})...\n`);

          try {
            const comparison = await compareCollection(collectionName, options.query, options.topK);
            comparisons.push(comparison);
            displayComparison(comparison);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`  ❌ Failed: ${message}`);
          }
        }

        // Cross-collection overlap summary
        if (comparisons.length >= 2) {
          console.log('\n📊 Overlap Summary');
          console.log('─────────────────────────────────────────────────');
          for (let i = 0; i < comparisons.length - 1; i++) {
            for (let j = i + 1; j < comparisons.length; j++) {
              const a = comparisons[i];
              const b = comparisons[j];
              const overlap = calculateOverlap(a.results, b.results);
              console.log(
                `  ${a.provider} ↔ ${b.provider}: ${overlap}/${options.topK} results shared`
              );
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Error: ${message}\n`);
        process.exit(1);
      }
    });

  return command;
}
