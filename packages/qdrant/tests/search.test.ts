import { describe, it, expect, vi } from 'vitest';
import { SearchManager, WikipediaPayload, SearchResult, QdrantClientWrapper } from '../src/index.js';

describe('SearchManager', () => {
  describe('WikipediaPayload type', () => {
    it('should have correct structure', () => {
      const payload: WikipediaPayload = {
        articleTitle: 'Quantum Computing',
        sectionName: 'Applications',
        paragraphPosition: 3,
        dumpVersion: '20260209',
        embeddingModel: 'text-embedding-3-small',
      };

      expect(payload.articleTitle).toBe('Quantum Computing');
      expect(payload.sectionName).toBe('Applications');
      expect(payload.paragraphPosition).toBe(3);
      expect(payload.dumpVersion).toBe('20260209');
      expect(payload.embeddingModel).toBe('text-embedding-3-small');
    });

    it('should allow empty section name', () => {
      const payload: WikipediaPayload = {
        articleTitle: 'Test Article',
        sectionName: '',
        paragraphPosition: 0,
        dumpVersion: '20260209',
        embeddingModel: 'text-embedding-3-small',
      };

      expect(payload.sectionName).toBe('');
    });
  });

  describe('SearchResult type', () => {
    it('should have correct structure', () => {
      const result: SearchResult = {
        id: 'point-123',
        score: 0.95,
        payload: {
          articleTitle: 'Quantum Computing',
          sectionName: 'Applications',
          paragraphPosition: 3,
          dumpVersion: '20260209',
          embeddingModel: 'text-embedding-3-small',
        },
        vector: [0.1, 0.2, 0.3],
      };

      expect(result.id).toBe('point-123');
      expect(result.score).toBe(0.95);
      expect(result.payload).toBeDefined();
      expect(Array.isArray(result.vector)).toBe(true);
    });

    it('should allow undefined vector', () => {
      const result: SearchResult = {
        id: 'point-456',
        score: 0.85,
        payload: {
          articleTitle: 'Test',
          sectionName: '',
          paragraphPosition: 0,
          dumpVersion: '20260209',
          embeddingModel: 'text-embedding-3-small',
        },
      };

      expect(result.vector).toBeUndefined();
    });
  });

  describe('search result ordering', () => {
    it('should sort results by score descending', () => {
      const results: SearchResult[] = [
        {
          id: '1',
          score: 0.95,
          payload: {
            articleTitle: 'High Match',
            sectionName: '',
            paragraphPosition: 0,
            dumpVersion: '20260209',
            embeddingModel: 'text-embedding-3-small',
          },
        },
        {
          id: '2',
          score: 0.85,
          payload: {
            articleTitle: 'Medium Match',
            sectionName: '',
            paragraphPosition: 0,
            dumpVersion: '20260209',
            embeddingModel: 'text-embedding-3-small',
          },
        },
        {
          id: '3',
          score: 0.75,
          payload: {
            articleTitle: 'Low Match',
            sectionName: '',
            paragraphPosition: 0,
            dumpVersion: '20260209',
            embeddingModel: 'text-embedding-3-small',
          },
        },
      ];

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });
  });

  describe('similaritySearch', () => {
    it('should sort results by score descending', async () => {
      const mockClient = {
        search: vi.fn().mockResolvedValue([
          { id: 'b', score: 0.7, payload: {} },
          { id: 'a', score: 0.9, payload: {} },
          { id: 'c', score: 0.5, payload: {} },
        ]),
      };

      const wrapper = {
        ensureConnected: vi.fn().mockResolvedValue(undefined),
        getClient: vi.fn().mockReturnValue(mockClient),
      } as unknown as QdrantClientWrapper;

      const manager = new SearchManager(wrapper);
      const results = await manager.similaritySearch('wiki-paragraph-20260209', [0.1, 0.2]);

      expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    });
  });
});
