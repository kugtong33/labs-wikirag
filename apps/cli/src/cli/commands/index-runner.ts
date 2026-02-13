/**
 * Index runner - Orchestrates Wikipedia indexing with checkpoint/resume
 *
 * Manages the complete indexing lifecycle including:
 * - Checkpoint loading and validation
 * - Progress tracking and metrics
 * - Graceful shutdown on SIGINT
 * - Resume from last checkpoint
 *
 * @module cli/commands/index-runner
 */

import { parseWikipediaDump, type WikipediaParagraph } from '../../parser/index.js';
import { EmbeddingPipeline } from '../../embedding/pipeline.js';
import { qdrantClient, collectionManager } from '@wikirag/qdrant';
import {
  saveCheckpoint,
  loadCheckpoint,
  checkpointExists,
  validateCheckpoint,
  getCheckpointPath,
  createInitialCheckpoint,
  type CheckpointData,
} from '../checkpoint.js';
import type { IndexCommandOptions } from './index-command.js';

/**
 * Indexing state for checkpoint management
 */
interface IndexingState {
  checkpoint: CheckpointData;
  isShuttingDown: boolean;
  articlesInBatch: number;
  lastSeenArticleId: string;
}

/**
 * Default checkpoint save interval (articles)
 */
const DEFAULT_CHECKPOINT_INTERVAL = 100;

/**
 * Run Wikipedia indexing with checkpoint/resume support
 *
 * @param options - Indexing command options
 */
export async function runIndexing(options: IndexCommandOptions): Promise<void> {
  const checkpointFile =
    options.checkpointFile || getCheckpointPath(options.strategy);

  // Load or create checkpoint
  const { checkpoint, isResume } = await loadOrCreateCheckpoint(
    checkpointFile,
    options
  );

  console.log('\n🚀 Starting Wikipedia Indexing');
  console.log('═'.repeat(50));
  console.log(`Dump file: ${options.dumpFile}`);
  console.log(`Strategy: ${options.strategy}`);
  console.log(`Dump date: ${options.dumpDate}`);
  console.log(`Model: ${options.model || 'text-embedding-3-small'}`);
  console.log(`Batch size: ${options.batchSize || 100}`);
  console.log(`Collection: ${checkpoint.collectionName}`);

  if (isResume) {
    console.log(`\n⏯️  Resuming from article ID: ${checkpoint.lastArticleId}`);
    console.log(`   Articles processed so far: ${checkpoint.articlesProcessed}`);
  }

  console.log('═'.repeat(50));
  console.log('');

  // Initialize state
  const state: IndexingState = {
    checkpoint,
    isShuttingDown: false,
    articlesInBatch: 0,
    lastSeenArticleId: checkpoint.lastArticleId,
  };

  // Set up graceful shutdown handler
  setupGracefulShutdown(state, checkpointFile);

  try {
    // Connect to Qdrant
    await qdrantClient.connect();

    // Ensure collection exists
    await ensureCollection(checkpoint.collectionName, options);

    // Run indexing pipeline with resume support
    await runIndexingPipeline(state, options, checkpointFile, isResume);

    console.log('\n✅ Indexing completed successfully!');
    console.log(`Total articles processed: ${state.checkpoint.articlesProcessed}`);
  } catch (error) {
    // Save checkpoint on error
    await saveCheckpoint(state.checkpoint, checkpointFile);

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Indexing failed: ${message}`);
  }
}

/**
 * Load existing checkpoint or create new one
 *
 * @param checkpointFile - Path to checkpoint file
 * @param options - Indexing options
 * @returns Checkpoint and resume flag
 */
async function loadOrCreateCheckpoint(
  checkpointFile: string,
  options: IndexCommandOptions
): Promise<{ checkpoint: CheckpointData; isResume: boolean }> {
  const collectionName = `wiki-${options.strategy}-${options.dumpDate}`;
  const embeddingModel = options.model || 'text-embedding-3-small';

  // Check if checkpoint exists
  if (await checkpointExists(checkpointFile)) {
    try {
      const checkpoint = await loadCheckpoint(checkpointFile);

      // Validate checkpoint matches current parameters
      if (
        validateCheckpoint(checkpoint, {
          strategy: options.strategy,
          dumpFile: options.dumpFile,
          dumpDate: options.dumpDate,
        })
      ) {
        return { checkpoint, isResume: true };
      } else {
        console.warn(
          '\n⚠️  Checkpoint file exists but parameters don\'t match. Starting fresh.\n'
        );
      }
    } catch (error) {
      console.warn(
        '\n⚠️  Failed to load checkpoint. Starting fresh.\n',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Create new checkpoint
  const checkpoint = createInitialCheckpoint({
    strategy: options.strategy,
    dumpFile: options.dumpFile,
    dumpDate: options.dumpDate,
    embeddingModel,
    collectionName,
  });

  return { checkpoint, isResume: false };
}

/**
 * Ensure Qdrant collection exists with correct configuration
 *
 * @param collectionName - Name of collection
 * @param options - Indexing options
 */
async function ensureCollection(
  collectionName: string,
  options: IndexCommandOptions
): Promise<void> {
  const exists = await collectionManager.collectionExists(collectionName);

  if (!exists) {
    console.log(`📦 Creating collection: ${collectionName}`);

    // Determine vector size based on model
    const vectorSize =
      options.model === 'text-embedding-3-large' ? 3072 : 1536;

    await collectionManager.createCollection(
      options.strategy,
      options.dumpDate,
      vectorSize
    );

    console.log(`✅ Collection created\n`);
  } else {
    console.log(`📦 Using existing collection: ${collectionName}\n`);
  }
}

/**
 * Run the indexing pipeline with checkpoint/resume
 *
 * @param state - Indexing state
 * @param options - Indexing options
 * @param checkpointFile - Path to checkpoint file
 * @param isResume - Whether resuming from checkpoint
 */
async function runIndexingPipeline(
  state: IndexingState,
  options: IndexCommandOptions,
  checkpointFile: string,
  isResume: boolean
): Promise<void> {
  const paragraphs = parseWikipediaDump(options.dumpFile);
  const filteredParagraphs = filterParagraphs(
    paragraphs,
    state.checkpoint.lastArticleId,
    isResume,
    state,
    checkpointFile
  );

  const pipeline = new EmbeddingPipeline({
    dumpVersion: options.dumpDate,
    strategy: options.strategy,
    embedding: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: options.model || 'text-embedding-3-small',
      batchSize: options.batchSize || 100,
    },
    qdrant: {
      collectionName: state.checkpoint.collectionName,
    },
    logInterval: DEFAULT_CHECKPOINT_INTERVAL,
  });

  await pipeline.runWithParagraphs(filteredParagraphs);

  // Save final checkpoint
  state.checkpoint.lastArticleId = state.lastSeenArticleId;
  state.checkpoint.timestamp = new Date().toISOString();
  await saveCheckpoint(state.checkpoint, checkpointFile);
}

/**
 * Filter paragraphs to skip already-processed articles
 *
 * @param paragraphs - Input paragraph stream
 * @param lastArticleId - Last processed article ID
 * @param isResume - Whether resuming
 * @yields Filtered paragraphs
 */
async function* filterParagraphs(
  paragraphs: AsyncIterable<WikipediaParagraph>,
  lastArticleId: string,
  isResume: boolean,
  state: IndexingState,
  checkpointFile: string
): AsyncGenerator<WikipediaParagraph> {
  if (!isResume) {
    for await (const paragraph of paragraphs) {
      if (state.isShuttingDown) break;
      await handleProgress(paragraph, state, checkpointFile);
      yield paragraph;
    }
    return;
  }

  // Resuming - skip until we reach the last processed article
  let foundLastArticle = false;

  for await (const paragraph of paragraphs) {
    if (!foundLastArticle) {
      if (paragraph.articleId === lastArticleId) {
        foundLastArticle = true;
      }
      continue; // Skip this paragraph
    }

    if (state.isShuttingDown) break;
    await handleProgress(paragraph, state, checkpointFile);
    yield paragraph;
  }
}

async function handleProgress(
  paragraph: WikipediaParagraph,
  state: IndexingState,
  checkpointFile: string
): Promise<void> {
  if (paragraph.articleId !== state.lastSeenArticleId) {
    state.lastSeenArticleId = paragraph.articleId;
    state.articlesInBatch += 1;

    if (state.articlesInBatch >= DEFAULT_CHECKPOINT_INTERVAL) {
      state.checkpoint.lastArticleId = state.lastSeenArticleId;
      state.checkpoint.articlesProcessed += state.articlesInBatch;
      state.checkpoint.timestamp = new Date().toISOString();

      console.log(
        `Progress: ${state.checkpoint.articlesProcessed} articles processed`
      );

      await saveCheckpoint(state.checkpoint, checkpointFile);
      state.articlesInBatch = 0;
    }
  }
}

/**
 * Set up graceful shutdown handler for SIGINT (Ctrl+C)
 *
 * @param state - Indexing state
 * @param checkpointFile - Path to checkpoint file
 */
function setupGracefulShutdown(
  state: IndexingState,
  checkpointFile: string
): void {
  process.on('SIGINT', async () => {
    if (state.isShuttingDown) {
      console.log('\n⚠️  Force quit - checkpoint may not be saved!');
      process.exit(1);
    }

    state.isShuttingDown = true;

    console.log('\n\n⏸️  Received SIGINT (Ctrl+C), saving checkpoint...');

    try {
      // Update checkpoint with current progress
      state.checkpoint.articlesProcessed += state.articlesInBatch;
      state.checkpoint.timestamp = new Date().toISOString();

      await saveCheckpoint(state.checkpoint, checkpointFile);

      // Best-effort close Qdrant connection
      try {
        const client = qdrantClient.getClient();
        if (typeof (client as any).close === 'function') {
          await (client as any).close();
        }
      } catch {
        // Ignore close errors
      }

      console.log('✅ Checkpoint saved successfully');
      console.log(`   Last article ID: ${state.checkpoint.lastArticleId}`);
      console.log(`   Articles processed: ${state.checkpoint.articlesProcessed}`);
      console.log('\n💡 Resume by running the same command again.\n');

      process.exit(130); // SIGINT exit code
    } catch (error) {
      console.error(
        '❌ Failed to save checkpoint:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
}
