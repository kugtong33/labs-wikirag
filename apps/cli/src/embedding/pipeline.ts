/**
 * Embedding pipeline orchestrator
 *
 * Wires together the complete embedding pipeline:
 * parseWikipediaDump → batch → embed → insert
 *
 * @module embedding/pipeline
 */

import * as R from 'ramda';
import { parseWikipediaDump, type WikipediaParagraph } from '../parser/index.js';
import { OpenAIClient } from './openai-client.js';
import { BatchProcessor } from './batch-processor.js';
import { QdrantInserter } from './qdrant-inserter.js';
import type { PipelineConfig, EmbeddingMetrics } from './types.js';
import { qdrantClient } from '@wikirag/qdrant';

/**
 * Default log interval (paragraphs)
 */
const DEFAULT_LOG_INTERVAL = 1000;

/**
 * Embedding pipeline orchestrator
 *
 * This orchestrator:
 * - Coordinates all pipeline stages
 * - Manages progress tracking and metrics
 * - Implements streaming pipeline pattern
 * - Logs progress at configurable intervals
 *
 * @example
 * ```typescript
 * const pipeline = new EmbeddingPipeline({
 *   dumpVersion: '20260210',
 *   strategy: 'paragraph',
 *   embedding: {
 *     apiKey: process.env.OPENAI_API_KEY!,
 *     model: 'text-embedding-3-small'
 *   },
 *   qdrant: {
 *     collectionName: 'wiki-paragraph-20260210'
 *   },
 *   logInterval: 1000
 * });
 *
 * await pipeline.run('/path/to/dump.xml');
 * ```
 */
export class EmbeddingPipeline {
  private config: Required<PipelineConfig>;
  private metrics: EmbeddingMetrics;

  constructor(config: PipelineConfig) {
    this.config = {
      ...config,
      logInterval: config.logInterval ?? DEFAULT_LOG_INTERVAL,
    };

    this.metrics = this.initializeMetrics();
  }

  /**
   * Run the complete embedding pipeline
   *
   * Pipeline stages:
   * 1. Parse Wikipedia XML dump (streaming)
   * 2. Batch paragraphs for embedding
   * 3. Generate embeddings via OpenAI
   * 4. Insert embeddings into Qdrant
   * 5. Track metrics and log progress
   *
   * @param dumpFilePath - Path to Wikipedia XML dump file
   * @returns Final metrics
   */
  public async run(dumpFilePath: string): Promise<EmbeddingMetrics> {
    console.log('Starting embedding pipeline...');
    console.log(`Dump file: ${dumpFilePath}`);
    console.log(`Collection: ${this.config.qdrant.collectionName}`);
    console.log(`Model: ${this.config.embedding.model}`);
    console.log('---');

    try {
      // Initialize pipeline components
      const openaiClient = OpenAIClient.getInstance(this.config.embedding);
      const batchProcessor = new BatchProcessor({
        dumpVersion: this.config.dumpVersion,
        embeddingModel: this.config.embedding.model ?? 'text-embedding-3-small',
        client: openaiClient,
        batchSize: this.config.embedding.batchSize,
      });

      // Connect to Qdrant
      await qdrantClient.connect();
      const qdrantNativeClient = qdrantClient.getClient();

      const qdrantInserter = new QdrantInserter(
        this.config.qdrant,
        qdrantNativeClient
      );

      // Run the streaming pipeline
      await this.runPipeline(dumpFilePath, batchProcessor, qdrantInserter);

      // Calculate final metrics
      this.finalizeMetrics();

      console.log('---');
      console.log('Pipeline completed successfully!');
      this.logFinalMetrics();

      return this.metrics;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Pipeline failed: ${message}`);
      throw error;
    }
  }

  /**
   * Run the streaming pipeline
   *
   * Uses async generators for memory-efficient streaming.
   *
   * @param dumpFilePath - Path to dump file
   * @param batchProcessor - Batch processor instance
   * @param qdrantInserter - Qdrant inserter instance
   */
  private async runPipeline(
    dumpFilePath: string,
    batchProcessor: BatchProcessor,
    qdrantInserter: QdrantInserter
  ): Promise<void> {
    // Stage 1: Parse Wikipedia dump
    const paragraphs = parseWikipediaDump(dumpFilePath);

    // Stage 2: Batch and embed paragraphs
    const embeddedBatches = batchProcessor.processBatches(paragraphs);

    // Stage 3: Insert into Qdrant and track progress
    for await (const result of qdrantInserter.insertBatches(embeddedBatches)) {
      this.updateMetrics(result.count, result.batchSize);
      this.maybeLogProgress();
    }
  }

  /**
   * Update metrics after each batch
   *
   * @param insertedCount - Number of successfully inserted paragraphs
   * @param batchSize - Total batch size
   */
  private updateMetrics(insertedCount: number, batchSize: number): void {
    this.metrics.paragraphsProcessed += batchSize;
    this.metrics.embeddingsGenerated += insertedCount;
    this.metrics.apiCallsMade += 1; // One API call per batch

    // Count errors (batch size - inserted count)
    const errors = batchSize - insertedCount;
    if (errors > 0) {
      this.metrics.errors += errors;
    }
  }

  /**
   * Log progress if interval reached
   */
  private maybeLogProgress(): void {
    if (this.metrics.paragraphsProcessed % this.config.logInterval === 0) {
      this.logProgress();
    }
  }

  /**
   * Log current progress metrics
   */
  private logProgress(): void {
    const elapsed = Date.now() - this.metrics.startTime;
    const rate = this.metrics.paragraphsProcessed / (elapsed / 1000);
    const eta = this.calculateETA(rate);

    console.log(
      `Progress: ${this.metrics.paragraphsProcessed.toLocaleString()} paragraphs | ` +
        `${this.metrics.embeddingsGenerated.toLocaleString()} embedded | ` +
        `${this.metrics.apiCallsMade.toLocaleString()} API calls | ` +
        `${rate.toFixed(1)} p/s | ` +
        `ETA: ${eta}`
    );

    if (this.metrics.errors > 0) {
      console.warn(`Errors: ${this.metrics.errors}`);
    }

    if (this.metrics.rateLimitHits > 0) {
      console.warn(`Rate limit hits: ${this.metrics.rateLimitHits}`);
    }
  }

  /**
   * Log final metrics summary
   */
  private logFinalMetrics(): void {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const rate = this.metrics.paragraphsProcessed / elapsed;

    console.log('Final Metrics:');
    console.log(`  Total paragraphs: ${this.metrics.paragraphsProcessed.toLocaleString()}`);
    console.log(`  Embeddings generated: ${this.metrics.embeddingsGenerated.toLocaleString()}`);
    console.log(`  API calls: ${this.metrics.apiCallsMade.toLocaleString()}`);
    console.log(`  Errors: ${this.metrics.errors.toLocaleString()}`);
    console.log(`  Rate limit hits: ${this.metrics.rateLimitHits.toLocaleString()}`);
    console.log(`  Total time: ${elapsed.toFixed(1)}s`);
    console.log(`  Average rate: ${rate.toFixed(1)} paragraphs/sec`);
  }

  /**
   * Calculate estimated time remaining
   *
   * @param rate - Current processing rate (paragraphs/sec)
   * @returns Human-readable ETA string
   */
  private calculateETA(rate: number): string {
    if (!this.metrics.estimatedTimeRemaining) {
      return 'calculating...';
    }

    const seconds = Math.floor(this.metrics.estimatedTimeRemaining / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  /**
   * Finalize metrics after pipeline completion
   */
  private finalizeMetrics(): void {
    this.metrics.estimatedTimeRemaining = 0;
  }

  /**
   * Initialize metrics at pipeline start
   *
   * @returns Initial metrics object
   */
  private initializeMetrics(): EmbeddingMetrics {
    return {
      paragraphsProcessed: 0,
      embeddingsGenerated: 0,
      apiCallsMade: 0,
      errors: 0,
      rateLimitHits: 0,
      startTime: Date.now(),
      estimatedTimeRemaining: undefined,
    };
  }

  /**
   * Get current metrics
   *
   * @returns Current pipeline metrics
   */
  public getMetrics(): EmbeddingMetrics {
    return R.clone(this.metrics);
  }

  /**
   * Get pipeline configuration
   *
   * @returns Current pipeline configuration
   */
  public getConfig(): Required<PipelineConfig> {
    return R.clone(this.config);
  }
}
