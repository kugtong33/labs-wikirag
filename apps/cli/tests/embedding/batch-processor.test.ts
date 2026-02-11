/**
 * Tests for batch processor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchProcessor } from '../../src/embedding/batch-processor';
import { OpenAIClient } from '../../src/embedding/openai-client';
import type { ParsedParagraph, BatchEmbeddingResult } from '../../src/embedding/types';

describe('BatchProcessor', () => {
  let mockClient: OpenAIClient;

  beforeEach(() => {
    // Create mock OpenAI client
    mockClient = {
      generateEmbeddings: vi.fn(),
      getConfig: vi.fn(),
    } as any;
  });

  describe('processBatches', () => {
    it('should process paragraphs in batches', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
        failedIndices: [],
        errors: [],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 2,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs = createMockParagraphs(4);

      const results: any[] = [];
      for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(2);
      expect(mockGenerateEmbeddings).toHaveBeenCalledTimes(2);
    });

    it('should handle partial batches', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        failedIndices: [],
        errors: [],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 2,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs = createMockParagraphs(3);

      const results: any[] = [];
      for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(2); // Full batch
      expect(results[1]).toHaveLength(1); // Partial batch
    });

    it('should combine embeddings with metadata', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        failedIndices: [],
        errors: [],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 1,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs: ParsedParagraph[] = [
        {
          content: 'Test content',
          articleTitle: 'Test Article',
          sectionName: 'Introduction',
          paragraphPosition: 0,
        },
      ];

      const results: any[] = [];
      for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
        results.push(batch);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);

      const embedded = results[0][0];
      expect(embedded.vector).toEqual([0.1, 0.2, 0.3]);
      expect(embedded.payload).toEqual({
        articleTitle: 'Test Article',
        sectionName: 'Introduction',
        paragraphPosition: 0,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
      });
    });

    it('should handle partial batch failures', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.7, 0.8, 0.9],
        ],
        failedIndices: [1], // Second item failed
        errors: ['', 'API error'],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 3,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs = createMockParagraphs(3);

      const results: any[] = [];
      for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
        results.push(batch);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(2); // Only successful items
    });

    it('should use default batch size', () => {
      const processor = new BatchProcessor({
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const config = processor.getConfig();
      expect(config.batchSize).toBe(100);
    });

    it('should extract content for embedding using Ramda', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
        failedIndices: [],
        errors: [],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 2,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs: ParsedParagraph[] = [
        {
          content: 'Content 1',
          articleTitle: 'Article 1',
          sectionName: 'Section 1',
          paragraphPosition: 0,
        },
        {
          content: 'Content 2',
          articleTitle: 'Article 2',
          sectionName: 'Section 2',
          paragraphPosition: 1,
        },
      ];

      await processor.processBatches(asyncIterator(paragraphs)).next();

      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(['Content 1', 'Content 2']);
    });
  });

  describe('error handling', () => {
    it('should handle complete batch failure', async () => {
      const mockGenerateEmbeddings = vi.fn().mockResolvedValue({
        embeddings: [],
        failedIndices: [0, 1],
        errors: ['API error', 'API error'],
      } as BatchEmbeddingResult);

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 2,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs = createMockParagraphs(2);

      await expect(async () => {
        for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
          // Should throw before yielding
        }
      }).rejects.toThrow();
    });

    it('should continue processing after recoverable errors', async () => {
      let callCount = 0;
      const mockGenerateEmbeddings = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First batch fails partially
          return Promise.resolve({
            embeddings: [[0.1, 0.2, 0.3]],
            failedIndices: [1],
            errors: ['', 'Temporary error'],
          });
        }
        // Second batch succeeds
        return Promise.resolve({
          embeddings: [
            [0.4, 0.5, 0.6],
            [0.7, 0.8, 0.9],
          ],
          failedIndices: [],
          errors: [],
        });
      });

      mockClient.generateEmbeddings = mockGenerateEmbeddings;

      const processor = new BatchProcessor({
        batchSize: 2,
        dumpVersion: '20260210',
        embeddingModel: 'text-embedding-3-small',
        client: mockClient,
      });

      const paragraphs = createMockParagraphs(4);

      const results: any[] = [];
      for await (const batch of processor.processBatches(asyncIterator(paragraphs))) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(1); // Partial success
      expect(results[1]).toHaveLength(2); // Full success
    });
  });
});

// Helper functions

function createMockParagraphs(count: number): ParsedParagraph[] {
  return Array.from({ length: count }, (_, i) => ({
    content: `Content ${i}`,
    articleTitle: `Article ${i}`,
    sectionName: `Section ${i}`,
    paragraphPosition: i,
  }));
}

async function* asyncIterator<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}
