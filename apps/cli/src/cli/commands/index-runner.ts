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
import { parseMultistreamIndex, getStreamBlocks } from '../../parser/multistream-index.js';
import { readMultistreamParallel } from '../../parser/parallel-stream-reader.js';
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
  completedArticlesInBatch: number;
  currentArticleId: string | null;
  lastCompletedArticleId: string;
}

/**
 * Default checkpoint save interval (articles)
 */
const DEFAULT_CHECKPOINT_INTERVAL = 100;

const OPENAI_DEFAULT_MODEL = 'text-embedding-3-small';

function resolveEmbeddingModel(
  embeddingProvider: string,
  requestedModel?: string
): string {
  if (requestedModel && requestedModel.trim() !== '') {
    return requestedModel;
  }

  if (embeddingProvider === 'openai') {
    return OPENAI_DEFAULT_MODEL;
  }

  return embeddingProvider;
}

function resolveVectorSize(embeddingProvider: string, embeddingModel: string): number {
  if (embeddingProvider === 'openai') {
    return embeddingModel === 'text-embedding-3-large' ? 3072 : 1536;
  }

  if (embeddingProvider === 'nomic-embed-text') {
    return 768;
  }

  if (embeddingProvider === 'qwen3-embedding') {
    return 1024;
  }

  throw new Error(
    `Cannot determine vector size for provider "${embeddingProvider}" and model "${embeddingModel}"`
  );
}

/**
 * Run Wikipedia indexing with checkpoint/resume support
 *
 * @param options - Indexing command options
 */
export async function runIndexing(options: IndexCommandOptions): Promise<void> {
  const checkpointFile =
    options.checkpointFile || getCheckpointPath(options.strategy);
  const embeddingProvider = options.embeddingProvider || 'openai';
  const embeddingModel = resolveEmbeddingModel(embeddingProvider, options.model);

  // Load or create checkpoint
  const { checkpoint, isResume } = await loadOrCreateCheckpoint(
    checkpointFile,
    options,
    embeddingProvider,
    embeddingModel
  );

  console.log('\n🚀 Starting Wikipedia Indexing');
  console.log('═'.repeat(50));
  console.log(`Dump file: ${options.dumpFile}`);
  console.log(`Strategy: ${options.strategy}`);
  console.log(`Dump date: ${options.dumpDate}`);
  console.log(`Provider: ${embeddingProvider}`);
  console.log(`Model: ${embeddingModel}`);
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
    completedArticlesInBatch: 0,
    currentArticleId: null,
    lastCompletedArticleId: checkpoint.lastArticleId,
  };

  // Set up graceful shutdown handler
  const cleanupSignalHandlers = setupGracefulShutdown(state, checkpointFile);

  try {
    // Connect to Qdrant
    await qdrantClient.connect();

    // Ensure collection exists
    await ensureCollection(
      checkpoint.collectionName,
      options,
      embeddingProvider,
      embeddingModel
    );

    // Run indexing pipeline with resume support
    await runIndexingPipeline(
      state,
      options,
      checkpointFile,
      isResume,
      embeddingProvider,
      embeddingModel
    );

    console.log('\n✅ Indexing completed successfully!');
    console.log(`Total articles processed: ${state.checkpoint.articlesProcessed}`);
  } catch (error) {
    // Save checkpoint on error
    await persistCheckpointProgress(state, checkpointFile, false);

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Indexing failed: ${message}`);
  } finally {
    cleanupSignalHandlers();
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
  options: IndexCommandOptions,
  embeddingProvider: string,
  embeddingModel: string
): Promise<{ checkpoint: CheckpointData; isResume: boolean }> {
  const collectionName = `wiki-${options.strategy}-${embeddingProvider}-${options.dumpDate}`;

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
  options: IndexCommandOptions,
  embeddingProvider: string,
  embeddingModel: string
): Promise<void> {
  const exists = await collectionManager.collectionExists(collectionName);

  if (!exists) {
    console.log(`📦 Creating collection: ${collectionName}`);

    const vectorSize = resolveVectorSize(embeddingProvider, embeddingModel);

    await collectionManager.createCollection(
      options.strategy,
      embeddingProvider,
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
  isResume: boolean,
  embeddingProvider: string,
  embeddingModel: string
): Promise<void> {
  const streams = options.streams ?? 1;
  const useMultistream = streams > 1 && !!options.indexFile;

  let paragraphs: AsyncIterable<WikipediaParagraph>;

  if (useMultistream) {
    // Multistream parallel mode: parse index, filter completed blocks, run parallel
    const allEntries = await parseMultistreamIndex(options.indexFile!);
    let blocks = getStreamBlocks(allEntries);

    // Resume: filter out already-completed blocks
    const completedOffsets = state.checkpoint.completedBlockOffsets ?? [];
    if (isResume && completedOffsets.length > 0) {
      blocks = blocks.filter((b) => !completedOffsets.includes(b.byteOffset));
      console.log(
        `⏯️  Resuming multistream: ${blocks.length} blocks remaining (${completedOffsets.length} completed)`
      );
    }

    console.log(`⚡ Multistream mode: ${blocks.length} blocks, ${streams} parallel streams`);

    paragraphs = readMultistreamParallel(
      options.dumpFile,
      blocks,
      streams,
      {},
      async (block) => {
        if (!state.checkpoint.completedBlockOffsets) {
          state.checkpoint.completedBlockOffsets = [];
        }

        if (!state.checkpoint.completedBlockOffsets.includes(block.byteOffset)) {
          state.checkpoint.completedBlockOffsets.push(block.byteOffset);
          await persistCheckpointProgress(state, checkpointFile, true);
        }
      },
    );

    // Wrap paragraph stream to track article-level progress checkpoints
    const filteredParagraphs = trackMultistreamProgress(
      paragraphs,
      state,
      checkpointFile
    );

    const pipeline = new EmbeddingPipeline({
      dumpVersion: options.dumpDate,
      strategy: options.strategy,
      embeddingProvider,
      embedding: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: embeddingModel,
        batchSize: options.batchSize || 100,
      },
      qdrant: {
        collectionName: state.checkpoint.collectionName,
      },
      logInterval: DEFAULT_CHECKPOINT_INTERVAL,
    });

    await pipeline.runWithParagraphs(filteredParagraphs);
    await persistCheckpointProgress(state, checkpointFile, false);
    return;
  }

  // Sequential mode (single-stream, handles both .xml and .xml.bz2 via auto-detect)
  paragraphs = parseWikipediaDump(options.dumpFile);
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
    embeddingProvider,
    embedding: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: embeddingModel,
      batchSize: options.batchSize || 100,
    },
    qdrant: {
      collectionName: state.checkpoint.collectionName,
    },
    logInterval: DEFAULT_CHECKPOINT_INTERVAL,
  });

  await pipeline.runWithParagraphs(filteredParagraphs);

  // Flush final completed article and save checkpoint
  finalizePendingArticleProgress(state);
  await persistCheckpointProgress(state, checkpointFile, false);
}

/**
 * Track article progress for multistream mode.
 * Block completion is handled via readMultistreamParallel callback.
 */
async function* trackMultistreamProgress(
  paragraphs: AsyncIterable<WikipediaParagraph>,
  state: IndexingState,
  checkpointFile: string
): AsyncGenerator<WikipediaParagraph> {
  for await (const paragraph of paragraphs) {
    if (state.isShuttingDown) break;

    await handleProgress(paragraph, state, checkpointFile);
    yield paragraph;
  }
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
  if (!isResume || lastArticleId === '0') {
    for await (const paragraph of paragraphs) {
      if (state.isShuttingDown) break;
      await handleProgress(paragraph, state, checkpointFile);
      yield paragraph;
    }
    return;
  }

  // Resuming - skip all paragraphs up to and including last processed article
  let resumeScanState: ResumeScanState = {
    anchorFound: false,
    skippingAnchorTail: false,
  };

  for await (const paragraph of paragraphs) {
    const decision = nextResumeDecision(paragraph.articleId, lastArticleId, resumeScanState);
    resumeScanState = decision.state;

    if (decision.skip) {
      continue;
    }

    if (state.isShuttingDown) break;
    await handleProgress(paragraph, state, checkpointFile);
    yield paragraph;
  }

  if (!resumeScanState.anchorFound) {
    throw new Error(
      `Failed to resume: article ID ${lastArticleId} was not found in dump`
    );
  }
}

interface ResumeScanState {
  anchorFound: boolean;
  skippingAnchorTail: boolean;
}

interface ResumeDecision {
  skip: boolean;
  state: ResumeScanState;
}

export function nextResumeDecision(
  articleId: string,
  lastArticleId: string,
  state: ResumeScanState,
): ResumeDecision {
  if (lastArticleId === '0') {
    return { skip: false, state };
  }

  if (!state.anchorFound) {
    if (articleId === lastArticleId) {
      return {
        skip: true,
        state: {
          anchorFound: true,
          skippingAnchorTail: true,
        },
      };
    }

    return { skip: true, state };
  }

  if (state.skippingAnchorTail) {
    if (articleId === lastArticleId) {
      return { skip: true, state };
    }

    return {
      skip: false,
      state: {
        anchorFound: true,
        skippingAnchorTail: false,
      },
    };
  }

  return { skip: false, state };
}

async function handleProgress(
  paragraph: WikipediaParagraph,
  state: IndexingState,
  checkpointFile: string
): Promise<void> {
  if (state.currentArticleId === null) {
    state.currentArticleId = paragraph.articleId;
    return;
  }

  if (paragraph.articleId !== state.currentArticleId) {
    state.lastCompletedArticleId = state.currentArticleId;
    state.currentArticleId = paragraph.articleId;
    state.completedArticlesInBatch += 1;

    if (state.completedArticlesInBatch >= DEFAULT_CHECKPOINT_INTERVAL) {
      await persistCheckpointProgress(state, checkpointFile, true);
    }
  }
}

function finalizePendingArticleProgress(state: IndexingState): void {
  if (state.currentArticleId && state.currentArticleId !== state.lastCompletedArticleId) {
    state.lastCompletedArticleId = state.currentArticleId;
    state.completedArticlesInBatch += 1;
  }
}

async function persistCheckpointProgress(
  state: IndexingState,
  checkpointFile: string,
  logProgress: boolean
): Promise<void> {
  if (state.completedArticlesInBatch > 0) {
    state.checkpoint.articlesProcessed += state.completedArticlesInBatch;
    state.completedArticlesInBatch = 0;
  }

  state.checkpoint.lastArticleId = state.lastCompletedArticleId;
  state.checkpoint.totalArticles = state.checkpoint.articlesProcessed;
  state.checkpoint.timestamp = new Date().toISOString();

  if (logProgress) {
    console.log(`Progress: ${state.checkpoint.articlesProcessed} articles processed`);
  }

  await saveCheckpoint(state.checkpoint, checkpointFile);
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
): () => void {
  const sigintHandler = async (): Promise<void> => {
    if (state.isShuttingDown) {
      console.log('\n⚠️  Force quit - checkpoint may not be saved!');
      process.exit(1);
    }

    state.isShuttingDown = true;

    console.log('\n\n⏸️  Received SIGINT (Ctrl+C), saving checkpoint...');

    try {
      // Update checkpoint with current progress
      await persistCheckpointProgress(state, checkpointFile, false);

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
  };

  process.on('SIGINT', sigintHandler);

  return () => {
    process.removeListener('SIGINT', sigintHandler);
  };
}
