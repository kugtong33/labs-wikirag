/**
 * Tests for multistream-index module
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  parseMultistreamIndex,
  getStreamBlocks,
  type MultistreamBlock,
} from '../../src/parser/multistream-index.js';

describe('multistream-index', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parseMultistreamIndex', () => {
    it('should parse a plain-text index file', async () => {
      const indexPath = path.join(fixturesDir, 'multistream-index.txt');
      const entries = await parseMultistreamIndex(indexPath);

      expect(entries.length).toBe(9);
    });

    it('should parse entries with correct fields', async () => {
      const indexPath = path.join(fixturesDir, 'multistream-index.txt');
      const entries = await parseMultistreamIndex(indexPath);

      const first = entries[0];
      expect(first.byteOffset).toBe(0);
      expect(first.articleId).toBe('1');
      expect(first.articleTitle).toBe('Anarchism');
    });

    it('should sort entries by byteOffset', async () => {
      const indexPath = path.join(fixturesDir, 'multistream-index.txt');
      const entries = await parseMultistreamIndex(indexPath);

      const offsets = entries.map((e) => e.byteOffset);
      const sorted = [...offsets].sort((a, b) => a - b);
      expect(offsets).toEqual(sorted);
    });

    it('should handle article titles containing colons', async () => {
      const indexPath = path.join(fixturesDir, 'multistream-index.txt');
      const entries = await parseMultistreamIndex(indexPath);
      // Verify all entries have non-empty titles
      for (const entry of entries) {
        expect(entry.articleTitle.length).toBeGreaterThan(0);
      }
    });

    it('should throw on non-existent file', async () => {
      await expect(
        parseMultistreamIndex('/nonexistent/path/index.txt')
      ).rejects.toThrow();
    });
  });

  describe('getStreamBlocks', () => {
    it('should return empty array for empty entries', () => {
      expect(getStreamBlocks([])).toEqual([]);
    });

    it('should group entries by byteOffset into blocks', () => {
      const entries: MultistreamBlock[] = [
        { byteOffset: 0, articleId: '1', articleTitle: 'Article 1' },
        { byteOffset: 0, articleId: '2', articleTitle: 'Article 2' },
        { byteOffset: 4125, articleId: '3', articleTitle: 'Article 3' },
      ];

      const blocks = getStreamBlocks(entries);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].byteOffset).toBe(0);
      expect(blocks[0].articleIds).toEqual(['1', '2']);
      expect(blocks[1].byteOffset).toBe(4125);
      expect(blocks[1].articleIds).toEqual(['3']);
    });

    it('should set endOffset to next block start minus 1', () => {
      const entries: MultistreamBlock[] = [
        { byteOffset: 0, articleId: '1', articleTitle: 'A' },
        { byteOffset: 4125, articleId: '2', articleTitle: 'B' },
        { byteOffset: 9875, articleId: '3', articleTitle: 'C' },
      ];

      const blocks = getStreamBlocks(entries);
      expect(blocks[0].endOffset).toBe(4124);
      expect(blocks[1].endOffset).toBe(9874);
      expect(blocks[2].endOffset).toBe(-1); // Last block reads to end of file
    });

    it('should produce a single block with endOffset -1 for single-entry input', () => {
      const entries: MultistreamBlock[] = [
        { byteOffset: 0, articleId: '1', articleTitle: 'Only Article' },
      ];

      const blocks = getStreamBlocks(entries);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].byteOffset).toBe(0);
      expect(blocks[0].endOffset).toBe(-1);
      expect(blocks[0].articleIds).toEqual(['1']);
    });

    it('should build correct blocks from fixture index', async () => {
      const indexPath = path.join(fixturesDir, 'multistream-index.txt');
      const entries = await parseMultistreamIndex(indexPath);
      const blocks = getStreamBlocks(entries);

      // Fixture has 3 unique offsets: 0, 4125, 9875
      expect(blocks).toHaveLength(3);
      expect(blocks[0].byteOffset).toBe(0);
      expect(blocks[0].articleIds).toHaveLength(3); // 3 articles at offset 0
      expect(blocks[0].endOffset).toBe(4124);
      expect(blocks[1].byteOffset).toBe(4125);
      expect(blocks[1].articleIds).toHaveLength(3);
      expect(blocks[1].endOffset).toBe(9874);
      expect(blocks[2].byteOffset).toBe(9875);
      expect(blocks[2].articleIds).toHaveLength(3);
      expect(blocks[2].endOffset).toBe(-1);
    });
  });
});
