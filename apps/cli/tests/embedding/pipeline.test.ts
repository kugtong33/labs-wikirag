/**
 * Tests for embedding pipeline orchestrator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingPipeline } from '../../src/embedding/pipeline';
import type { PipelineConfig } from '../../src/embedding/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the parser module
vi.mock('../../src/parser/index.js', () => ({
  parseWikipediaDump: vi.fn(),
}));

// Mock the Qdrant client
vi.mock('@wikirag/qdrant', () => ({
  qdrantClient: {
    connect: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ status: 'ok' }),
    }),
  },
  collectionManager: {
    collectionExists: vi.fn().mockResolvedValue(true),
  },
}));

// Mock OpenAI
const mockCreate = vi.fn().mockResolvedValue({
  data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockCreate,
      };
    },
  };
});

describe('EmbeddingPipeline', () => {
  let config: PipelineConfig;
  let mockTempFile: string;

  beforeEach(async () => {
    config = {
      dumpVersion: '20260210',
      strategy: 'paragraph',
      embedding: {
        apiKey: 'test-api-key',
        model: 'text-embedding-3-small',
        batchSize: 2,
        maxRetries: 1,
        baseDelay: 10,
      },
      qdrant: {
        collectionName: 'wiki-paragraph-20260210',
        batchSize: 2,
      },
      logInterval: 5,
    };

    // Create a temporary test file
    mockTempFile = path.join(__dirname, 'test-dump.xml');
    await fs.writeFile(mockTempFile, '<mediawiki></mediawiki>');
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.unlink(mockTempFile);
    } catch {
      // Ignore errors
    }
    vi.clearAllMocks();
  });

  describe('run', () => {
    it('should run complete pipeline', async () => {
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      // Mock parser to yield paragraphs
      async function* mockParser() {
        yield {
          content: 'Paragraph 1',
          articleTitle: 'Article 1',
          sectionName: 'Section 1',
          paragraphPosition: 0,
        };
        yield {
          content: 'Paragraph 2',
          articleTitle: 'Article 1',
          sectionName: 'Section 1',
          paragraphPosition: 1,
        };
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);
      const metrics = await pipeline.run(mockTempFile);

      expect(metrics.paragraphsProcessed).toBe(2);
      expect(metrics.embeddingsGenerated).toBe(2);
      expect(metrics.apiCallsMade).toBeGreaterThan(0);
      expect(metrics.errors).toBe(0);
    });

    it('should connect to Qdrant', async () => {
      const { qdrantClient } = await import('@wikirag/qdrant');
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      async function* mockParser() {
        yield {
          content: 'Test',
          articleTitle: 'Test',
          sectionName: 'Test',
          paragraphPosition: 0,
        };
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);
      await pipeline.run(mockTempFile);

      expect(qdrantClient.connect).toHaveBeenCalled();
    });

    it('should use correct collection name', async () => {
      const { qdrantClient } = await import('@wikirag/qdrant');
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      async function* mockParser() {
        yield {
          content: 'Test',
          articleTitle: 'Test',
          sectionName: 'Test',
          paragraphPosition: 0,
        };
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);
      await pipeline.run(mockTempFile);

      const client = qdrantClient.getClient();
      expect(client.upsert).toHaveBeenCalledWith(
        'wiki-paragraph-20260210',
        expect.any(Object)
      );
    });

    it('should track metrics correctly', async () => {
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      async function* mockParser() {
        for (let i = 0; i < 10; i++) {
          yield {
            content: `Paragraph ${i}`,
            articleTitle: 'Article',
            sectionName: 'Section',
            paragraphPosition: i,
          };
        }
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);
      const metrics = await pipeline.run(mockTempFile);

      expect(metrics.paragraphsProcessed).toBe(10);
      expect(metrics.embeddingsGenerated).toBe(10);
      expect(metrics.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should handle empty dump', async () => {
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      async function* mockParser() {
        // Yield nothing
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);
      const metrics = await pipeline.run(mockTempFile);

      expect(metrics.paragraphsProcessed).toBe(0);
      expect(metrics.embeddingsGenerated).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use default log interval', () => {
      const minimalConfig: PipelineConfig = {
        dumpVersion: '20260210',
        strategy: 'paragraph',
        embedding: {
          apiKey: 'test-key',
        },
        qdrant: {
          collectionName: 'wiki-paragraph-20260210',
        },
      };

      const pipeline = new EmbeddingPipeline(minimalConfig);
      const pipelineConfig = pipeline.getConfig();

      expect(pipelineConfig.logInterval).toBe(1000);
    });

    it('should use custom log interval', () => {
      const pipeline = new EmbeddingPipeline(config);
      const pipelineConfig = pipeline.getConfig();

      expect(pipelineConfig.logInterval).toBe(5);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const pipeline = new EmbeddingPipeline(config);
      const metrics = pipeline.getMetrics();

      expect(metrics).toHaveProperty('paragraphsProcessed');
      expect(metrics).toHaveProperty('embeddingsGenerated');
      expect(metrics).toHaveProperty('apiCallsMade');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('rateLimitHits');
      expect(metrics).toHaveProperty('startTime');
    });

    it('should initialize metrics to zero', () => {
      const pipeline = new EmbeddingPipeline(config);
      const metrics = pipeline.getMetrics();

      expect(metrics.paragraphsProcessed).toBe(0);
      expect(metrics.embeddingsGenerated).toBe(0);
      expect(metrics.apiCallsMade).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.rateLimitHits).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from pipeline stages', async () => {
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      async function* mockParser() {
        throw new Error('Parse error');
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);

      await expect(pipeline.run(mockTempFile)).rejects.toThrow('Parse error');
    });

    it('should handle Qdrant connection errors', async () => {
      const { qdrantClient } = await import('@wikirag/qdrant');
      const { parseWikipediaDump } = await import('../../src/parser/index.js');

      vi.mocked(qdrantClient.connect).mockRejectedValue(
        new Error('Connection failed')
      );

      async function* mockParser() {
        yield {
          content: 'Test',
          articleTitle: 'Test',
          sectionName: 'Test',
          paragraphPosition: 0,
        };
      }

      vi.mocked(parseWikipediaDump).mockReturnValue(mockParser() as any);

      const pipeline = new EmbeddingPipeline(config);

      await expect(pipeline.run(mockTempFile)).rejects.toThrow('Connection failed');
    });
  });
});
