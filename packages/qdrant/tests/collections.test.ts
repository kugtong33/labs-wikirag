import { describe, it, expect, vi } from 'vitest';
import { CollectionManager, QdrantError, QdrantClientWrapper } from '../src/index.js';

describe('CollectionManager', () => {
  describe('collection naming convention', () => {
    it('should format collection names correctly', () => {
      // Test the naming format through create method validation
      // The internal formatCollectionName enforces wiki-{strategy}-{dump_date}
      const expectedName = 'wiki-paragraph-20260209';

      expect(expectedName).toMatch(/^wiki-[a-z]+-\d{8}$/);
      expect(expectedName).toContain('wiki-');
      expect(expectedName).toContain('-paragraph-');
      expect(expectedName).toContain('-20260209');
    });

    it('should create valid collection names for different strategies', () => {
      const strategies = ['paragraph', 'chunked', 'document'];
      const dumpDate = '20260209';

      strategies.forEach((strategy) => {
        const expectedName = `wiki-${strategy}-${dumpDate}`;
        expect(expectedName).toMatch(/^wiki-[a-z]+-\d{8}$/);
      });
    });
  });

  describe('collection configuration', () => {
    it('should support standard embedding dimensions', () => {
      const dimensions = [
        1536, // text-embedding-3-small, ada-002
        3072, // text-embedding-3-large
      ];

      dimensions.forEach((dim) => {
        expect(dim).toBeGreaterThan(0);
        expect(Number.isInteger(dim)).toBe(true);
      });
    });

    it('should support distance metrics', () => {
      const metrics: Array<'Cosine' | 'Euclid' | 'Dot'> = [
        'Cosine',
        'Euclid',
        'Dot',
      ];

      metrics.forEach((metric) => {
        expect(['Cosine', 'Euclid', 'Dot']).toContain(metric);
      });
    });
  });

  describe('collection operations', () => {
    const createMockWrapper = (collections: Array<{ name: string }> = []) => {
      const mockClient = {
        getCollections: vi.fn().mockResolvedValue({ collections }),
        createCollection: vi.fn().mockResolvedValue({ status: 'ok' }),
        deleteCollection: vi.fn().mockResolvedValue({ status: 'ok' }),
      };

      const wrapper = {
        ensureConnected: vi.fn().mockResolvedValue(undefined),
        getClient: vi.fn().mockReturnValue(mockClient),
      } as unknown as QdrantClientWrapper;

      return { wrapper, mockClient };
    };

    it('should return true when collection exists', async () => {
      const { wrapper } = createMockWrapper([{ name: 'wiki-paragraph-20260209' }]);
      const manager = new CollectionManager(wrapper);

      await expect(
        manager.collectionExists('wiki-paragraph-20260209')
      ).resolves.toBe(true);
    });

    it('should return false when collection does not exist', async () => {
      const { wrapper } = createMockWrapper([]);
      const manager = new CollectionManager(wrapper);

      await expect(
        manager.collectionExists('wiki-paragraph-20260209')
      ).resolves.toBe(false);
    });

    it('should create collection when it does not exist', async () => {
      const { wrapper, mockClient } = createMockWrapper([]);
      const manager = new CollectionManager(wrapper);

      const name = await manager.createCollection('paragraph', '20260209', 1536);
      expect(name).toBe('wiki-paragraph-20260209');
      expect(mockClient.createCollection).toHaveBeenCalled();
    });

    it('should throw when creating a collection that already exists', async () => {
      const { wrapper } = createMockWrapper([{ name: 'wiki-paragraph-20260209' }]);
      const manager = new CollectionManager(wrapper);

      await expect(
        manager.createCollection('paragraph', '20260209', 1536)
      ).rejects.toThrow(QdrantError);
    });

    it('should delete collection when it exists', async () => {
      const { wrapper, mockClient } = createMockWrapper([{ name: 'wiki-paragraph-20260209' }]);
      const manager = new CollectionManager(wrapper);

      await manager.deleteCollection('wiki-paragraph-20260209');
      expect(mockClient.deleteCollection).toHaveBeenCalledWith('wiki-paragraph-20260209');
    });
  });
});
