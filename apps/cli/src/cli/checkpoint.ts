/**
 * Checkpoint manager for resumable Wikipedia indexing
 *
 * Manages checkpoint files to enable pause/resume functionality
 * for long-running indexing operations.
 *
 * @module cli/checkpoint
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as R from 'ramda';

/**
 * Checkpoint data structure
 */
export interface CheckpointData {
  /** Last processed article ID */
  lastArticleId: string;
  /** Total articles processed so far */
  articlesProcessed: number;
  /** Total articles in dump (if known) */
  totalArticles?: number;
  /** Embedding strategy used */
  strategy: string;
  /** Path to Wikipedia dump file */
  dumpFile: string;
  /** Wikipedia dump date (YYYYMMDD) */
  dumpDate: string;
  /** OpenAI embedding model */
  embeddingModel: string;
  /** Qdrant collection name */
  collectionName: string;
  /** Checkpoint timestamp */
  timestamp: string;
}

/**
 * Parameters for validating checkpoint compatibility
 */
export interface CheckpointValidationParams {
  strategy: string;
  dumpFile: string;
  dumpDate: string;
}

/**
 * Save checkpoint data to file using atomic write
 *
 * Uses temporary file + rename for atomic write operation
 * to prevent corruption if process is interrupted during save.
 *
 * @param data - Checkpoint data to save
 * @param filePath - Path to checkpoint file
 */
export async function saveCheckpoint(
  data: CheckpointData,
  filePath: string
): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write to temporary file first
    const tempFile = `${filePath}.tmp`;
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(tempFile, json, 'utf-8');

    // Atomic rename
    await fs.rename(tempFile, filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save checkpoint: ${message}`);
  }
}

/**
 * Load checkpoint data from file
 *
 * @param filePath - Path to checkpoint file
 * @returns Checkpoint data
 * @throws Error if file doesn't exist or is invalid
 */
export async function loadCheckpoint(filePath: string): Promise<CheckpointData> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as CheckpointData;

    // Validate required fields
    const requiredFields = [
      'lastArticleId',
      'articlesProcessed',
      'strategy',
      'dumpFile',
      'dumpDate',
      'embeddingModel',
      'collectionName',
      'timestamp',
    ];

    const missingFields = R.reject(
      (field: string) => R.has(field, data),
      requiredFields
    );

    if (!R.isEmpty(missingFields)) {
      throw new Error(
        `Invalid checkpoint: missing fields ${missingFields.join(', ')}`
      );
    }

    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Checkpoint file not found');
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load checkpoint: ${message}`);
  }
}

/**
 * Check if checkpoint exists
 *
 * @param filePath - Path to checkpoint file
 * @returns True if checkpoint file exists
 */
export async function checkpointExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that checkpoint matches current indexing parameters
 *
 * Uses Ramda functional predicates for validation.
 *
 * @param checkpoint - Loaded checkpoint data
 * @param params - Current indexing parameters
 * @returns True if checkpoint is compatible
 */
export function validateCheckpoint(
  checkpoint: CheckpointData,
  params: CheckpointValidationParams
): boolean {
  // Validate each parameter matches using Ramda
  const validators = [
    R.pipe(R.prop('strategy'), R.equals(params.strategy)),
    R.pipe(R.prop('dumpFile'), R.equals(params.dumpFile)),
    R.pipe(R.prop('dumpDate'), R.equals(params.dumpDate)),
  ];

  return R.allPass(validators)(checkpoint);
}

/**
 * Get checkpoint file path for a given strategy
 *
 * Checkpoint files are strategy-specific to allow parallel indexing
 * with different strategies.
 *
 * @param strategy - Embedding strategy
 * @param baseDir - Base directory for checkpoints (default: current dir)
 * @returns Checkpoint file path
 */
export function getCheckpointPath(
  strategy: string,
  baseDir?: string
): string {
  if (baseDir) {
    return path.join(baseDir, 'indexing-checkpoint.json');
  }
  return 'indexing-checkpoint.json';
}

/**
 * Extract checkpoint metadata using Ramda
 *
 * @param checkpoint - Checkpoint data
 * @returns Metadata subset
 */
export const getCheckpointMetadata = R.pick([
  'lastArticleId',
  'articlesProcessed',
  'strategy',
  'dumpDate',
  'timestamp',
]) as (checkpoint: CheckpointData) => Pick<CheckpointData, 'lastArticleId' | 'articlesProcessed' | 'strategy' | 'dumpDate' | 'timestamp'>;

/**
 * Create initial checkpoint from parameters
 *
 * @param params - Indexing parameters
 * @returns Initial checkpoint data
 */
export function createInitialCheckpoint(params: {
  strategy: string;
  dumpFile: string;
  dumpDate: string;
  embeddingModel: string;
  collectionName: string;
}): CheckpointData {
  return {
    lastArticleId: '0',
    articlesProcessed: 0,
    totalArticles: undefined,
    strategy: params.strategy,
    dumpFile: params.dumpFile,
    dumpDate: params.dumpDate,
    embeddingModel: params.embeddingModel,
    collectionName: params.collectionName,
    timestamp: new Date().toISOString(),
  };
}
