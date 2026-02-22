/**
 * CLI command for indexing Wikipedia dumps into Qdrant
 *
 * Provides a command-line interface for the embedding pipeline
 * with checkpoint/resume capabilities.
 *
 * @module cli/commands/index-command
 */

import { Command } from 'commander';
import { z } from 'zod';
import { runIndexing } from './index-runner.js';

/**
 * Zod schema for index command options — single source of truth for
 * both runtime validation and the TypeScript type.
 */
export const IndexCommandOptionsSchema = z.object({
  /** Path to Wikipedia XML dump file */
  dumpFile: z.string().min(1, 'Dump file path cannot be empty'),
  /** Embedding strategy */
  strategy: z.enum(['paragraph', 'chunked', 'document'], {
    message: 'strategy must be one of: paragraph, chunked, document',
  }),
  /** Wikipedia dump date (YYYYMMDD format) */
  dumpDate: z.string().regex(/^\d{8}$/, 'dumpDate must be YYYYMMDD format (e.g., 20260210)'),
  /** Embedding provider */
  embeddingProvider: z
    .enum(['openai', 'nomic-embed-text', 'qwen3-embedding'], {
      message: 'Invalid embedding provider. Must be one of: openai, nomic-embed-text, qwen3-embedding',
    })
    .optional(),
  /** Embedding model override */
  model: z.string().min(1, 'model cannot be empty').optional(),
  /** Batch size for embedding API calls */
  batchSize: z
    .number()
    .finite({ message: 'Invalid batch size. Must be a finite number' })
    .int()
    .min(1, 'Invalid batch size. Must be between 1 and 2048')
    .max(2048, 'Invalid batch size. Must be between 1 and 2048')
    .optional(),
  /** Custom checkpoint file path */
  checkpointFile: z.string().optional(),
  /** Number of parallel bz2 streams */
  streams: z
    .number()
    .finite({ message: 'Invalid streams count. Must be a finite number' })
    .int()
    .min(1, 'Invalid streams count. Must be at least 1')
    .optional(),
  /** Path to multistream index file */
  indexFile: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.streams ?? 1) > 1 && !data.indexFile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '--index-file is required when --streams > 1',
      path: ['indexFile'],
    });
  }
  if (data.indexFile && !data.dumpFile.endsWith('.bz2')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '--index-file can only be used with a .xml.bz2 dump file',
      path: ['indexFile'],
    });
  }
});

/** Indexing command options — inferred from Zod schema */
export type IndexCommandOptions = z.infer<typeof IndexCommandOptionsSchema>;

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
    .option(
      '--streams <count>',
      'Number of parallel bz2 streams for multistream processing (requires --index-file)',
      (value) => parseInt(value, 10),
      1
    )
    .option(
      '--index-file <path>',
      'Path to multistream index file (.txt or .txt.bz2), required when --streams > 1'
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
 * Validate command options using the Zod schema.
 *
 * @param options - Command options to validate
 * @throws Error with a human-readable message if validation fails
 */
export function validateOptions(options: IndexCommandOptions): void {
  const result = IndexCommandOptionsSchema.safeParse(options);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join('; ');
    throw new Error(message);
  }
}
