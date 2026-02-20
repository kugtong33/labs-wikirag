/**
 * CLI command for indexing Wikipedia dumps into Qdrant
 *
 * Provides a command-line interface for the embedding pipeline
 * with checkpoint/resume capabilities.
 *
 * @module cli/commands/index-command
 */

import { Command } from 'commander';
import { runIndexing } from './index-runner.js';

/**
 * Indexing command options
 */
export interface IndexCommandOptions {
  /** Path to Wikipedia XML dump file */
  dumpFile: string;
  /** Embedding strategy (paragraph, chunked, document) */
  strategy: string;
  /** Wikipedia dump date (YYYYMMDD format) */
  dumpDate: string;
  /** Embedding provider (openai, nomic-embed-text, qwen3-embedding) (optional) */
  embeddingProvider?: string;
  /** Embedding model override (provider-specific, optional) */
  model?: string;
  /** Batch size for embedding API calls (optional) */
  batchSize?: number;
  /** Custom checkpoint file path (optional) */
  checkpointFile?: string;
}

/**
 * Create and configure the index command
 *
 * @returns Configured Commander command
 */
export function createIndexCommand(): Command {
  const command = new Command('index');

  command
    .description('Index Wikipedia dump into Qdrant vector database')
    .requiredOption(
      '--dump-file <path>',
      'Path to Wikipedia XML dump file (e.g., enwiki-20260210-pages-articles.xml)'
    )
    .requiredOption(
      '--strategy <strategy>',
      'Embedding strategy: paragraph, chunked, or document'
    )
    .requiredOption(
      '--dump-date <date>',
      'Wikipedia dump date in YYYYMMDD format (e.g., 20260210)'
    )
    .option(
      '--embedding-provider <provider>',
      'Embedding provider: openai, nomic-embed-text, qwen3-embedding',
      'openai'
    )
    .option(
      '--model <model>',
      'Embedding model name override (provider-specific)'
    )
    .option(
      '--batch-size <size>',
      'Batch size for embedding API calls',
      (value) => parseInt(value, 10),
      100
    )
    .option(
      '--checkpoint-file <path>',
      'Custom checkpoint file path (default: indexing-checkpoint-{strategy}.json)'
    )
    .action(async (options: IndexCommandOptions) => {
      try {
        // Validate options
        validateOptions(options);

        // Run indexing with checkpoint/resume
        await runIndexing(options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Error: ${message}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Validate command options
 *
 * @param options - Command options to validate
 * @throws Error if validation fails
 */
export function validateOptions(options: IndexCommandOptions): void {
  // Validate dump file path
  if (!options.dumpFile || options.dumpFile.trim() === '') {
    throw new Error('Dump file path cannot be empty');
  }

  // Validate strategy
  const validStrategies = ['paragraph', 'chunked', 'document'];
  if (!validStrategies.includes(options.strategy)) {
    throw new Error(
      `Invalid strategy: ${options.strategy}. Must be one of: ${validStrategies.join(', ')}`
    );
  }

  // Validate dump date format (YYYYMMDD)
  const datePattern = /^\d{8}$/;
  if (!datePattern.test(options.dumpDate)) {
    throw new Error(
      `Invalid dump date format: ${options.dumpDate}. Must be YYYYMMDD (e.g., 20260210)`
    );
  }

  // Validate batch size
  if (options.batchSize !== undefined) {
    if (options.batchSize < 1 || options.batchSize > 2048) {
      throw new Error(
        `Invalid batch size: ${options.batchSize}. Must be between 1 and 2048`
      );
    }
  }

  // Validate embedding provider
  const validProviders = ['openai', 'nomic-embed-text', 'qwen3-embedding'];
  const provider = options.embeddingProvider ?? 'openai';
  if (!validProviders.includes(provider)) {
    throw new Error(
      `Invalid embedding provider: ${provider}. Must be one of: ${validProviders.join(', ')}`
    );
  }

  // Validate model name (basic check)
  if (options.model && options.model.trim() === '') {
    throw new Error('Model name cannot be empty');
  }
}
