/**
 * Tests for Qdrant inserter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QdrantInserter } from '../../src/embedding/qdrant-inserter';
import { QdrantInsertError } from '../../src/embedding/errors';
import type { EmbeddedParagraph } from '../../src/embedding/types';
import type { QdrantClient } from '@qdrant/js-client-rest';
import type { CollectionManager } from '@wikirag/qdrant';

describe('QdrantInserter', () => {
  let mockClient: QdrantClient;
  let mockCollectionManager: CollectionManager;

  beforeEach(() => {
    mockClient = {
      upsert: vi.fn().mockResolvedValue({ status: 'ok' }),
    } as any;

    mockCollectionManager = {
      collectionExists: vi.fn().mockResolvedValue(true),
    } as any;
  });

  describe('insertBatches', () => {
    it('should insert batches of embedded paragraphs', async () => {
      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
          batchSize: 2,
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(2), createMockEmbeddedParagraphs(2)];

      const results: any[] = [];
      for await (const result of inserter.insertBatches(asyncIterator(batches))) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ count: 2, batchSize: 2 });
      expect(results[1]).toEqual({ count: 2, batchSize: 2 });

      expect(mockClient.upsert).toHaveBeenCalledTimes(2);
      expect(inserter.getInsertedCount()).toBe(4);
    });

    it('should verify collection exists before insertion', async () => {
      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(1)];

      for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
        // Just consume the iterator
      }

      expect(mockCollectionManager.collectionExists).toHaveBeenCalledWith(
        'wiki-paragraph-openai-20260210'
      );
    });

    it('should throw error if collection does not exist', async () => {
      mockCollectionManager.collectionExists = vi.fn().mockResolvedValue(false);

      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(1)];

      await expect(async () => {
        for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
          // Should throw before yielding
        }
      }).rejects.toThrow(QdrantInsertError);
    });

    it('should generate unique point IDs', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ status: 'ok' });
      mockClient.upsert = mockUpsert;

      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const paragraphs: EmbeddedParagraph[] = [
        {
          vector: [0.1, 0.2, 0.3],
          payload: {
            articleTitle: 'Test Article',
            articleId: '1',
            sectionName: 'Introduction',
            paragraphPosition: 0,
            dumpVersion: '20260210',
            embeddingModel: 'text-embedding-3-small',
            embeddingProvider: 'openai',
          },
        },
        {
          vector: [0.4, 0.5, 0.6],
          payload: {
            articleTitle: 'Test Article',
            articleId: '1',
            sectionName: 'Section 1',
            paragraphPosition: 1,
            dumpVersion: '20260210',
            embeddingModel: 'text-embedding-3-small',
            embeddingProvider: 'openai',
          },
        },
      ];

      const batches = [paragraphs];

      for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
        // Just consume
      }

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const call = mockUpsert.mock.calls[0];
      const points = call[1].points;

      expect(points).toHaveLength(2);
      expect(points[0].id).toContain('Test_Article');
      expect(points[0].id).toContain('Introduction');
      expect(points[1].id).toContain('Section_1');

      // IDs should be unique
      expect(points[0].id).not.toBe(points[1].id);
    });

    it('should handle empty batches', async () => {
      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(0)];

      const results: any[] = [];
      for await (const result of inserter.insertBatches(asyncIterator(batches))) {
        results.push(result);
      }

      // Empty batch should still be processed but with count 0
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });

    it('should wait for upsert completion', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ status: 'ok' });
      mockClient.upsert = mockUpsert;

      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(1)];

      for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
        // Just consume
      }

      expect(mockUpsert).toHaveBeenCalledWith('wiki-paragraph-openai-20260210', {
        wait: true,
        points: expect.any(Array),
      });
    });
  });

  describe('error handling', () => {
    it('should throw QdrantInsertError on upsert failure', async () => {
      mockClient.upsert = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(1)];

      await expect(async () => {
        for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
          // Should throw
        }
      }).rejects.toThrow(QdrantInsertError);
    });

    it('should include batch size in error', async () => {
      mockClient.upsert = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const batches = [createMockEmbeddedParagraphs(5)];

      try {
        for await (const _result of inserter.insertBatches(asyncIterator(batches))) {
          // Should throw
        }
      } catch (error) {
        expect(error).toBeInstanceOf(QdrantInsertError);
        expect((error as QdrantInsertError).batchSize).toBe(5);
      }
    });
  });

  describe('configuration', () => {
    it('should use default batch size', () => {
      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
        },
        mockClient,
        mockCollectionManager
      );

      const config = inserter.getConfig();
      expect(config.batchSize).toBe(100);
    });

    it('should use custom batch size', () => {
      const inserter = new QdrantInserter(
        {
          collectionName: 'wiki-paragraph-openai-20260210',
          batchSize: 50,
        },
        mockClient,
        mockCollectionManager
      );

      const config = inserter.getConfig();
      expect(config.batchSize).toBe(50);
    });
  });
});

// Helper functions

function createMockEmbeddedParagraphs(count: number): EmbeddedParagraph[] {
  return Array.from({ length: count }, (_, i) => ({
    vector: [0.1 * i, 0.2 * i, 0.3 * i],
    payload: {
      articleTitle: `Article ${i}`,
      articleId: `${i}`,
      sectionName: `Section ${i}`,
      paragraphPosition: i,
      dumpVersion: '20260210',
      embeddingModel: 'text-embedding-3-small',
      embeddingProvider: 'openai',
    },
  }));
}

async function* asyncIterator<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}
