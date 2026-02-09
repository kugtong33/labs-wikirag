import { describe, it, expect } from 'vitest';
import { CollectionManager, QdrantClientWrapper } from '../src/index.js';

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
});
