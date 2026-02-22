/**
 * Tests for checkpoint manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  saveCheckpoint,
  loadCheckpoint,
  checkpointExists,
  validateCheckpoint,
  getCheckpointPath,
  createInitialCheckpoint,
  getCheckpointMetadata,
  type CheckpointData,
} from '../../src/cli/checkpoint';

describe('Checkpoint Manager', () => {
  const testDir = path.join(__dirname, '.test-checkpoints');
  const testCheckpointPath = path.join(testDir, 'test-checkpoint.json');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint data to file', async () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '12345',
        articlesProcessed: 100,
        totalArticles: 1000,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
        timestamp: '2026-02-11T00:00:00.000Z',
      };

      await saveCheckpoint(checkpoint, testCheckpointPath);

      // Verify file exists
      const exists = await checkpointExists(testCheckpointPath);
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(testCheckpointPath, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved).toEqual(checkpoint);
    });

    it('should use atomic write (temp file + rename)', async () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '1',
        articlesProcessed: 1,
        totalArticles: 1,
        strategy: 'paragraph',
        dumpFile: '/test.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: new Date().toISOString(),
      };

      await saveCheckpoint(checkpoint, testCheckpointPath);

      // Temp file should not exist after save
      const tempFile = `${testCheckpointPath}.tmp`;
      const tempExists = await checkpointExists(tempFile);
      expect(tempExists).toBe(false);

      // Main file should exist
      const mainExists = await checkpointExists(testCheckpointPath);
      expect(mainExists).toBe(true);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'checkpoint.json');
      const checkpoint = createInitialCheckpoint({
        strategy: 'paragraph',
        dumpFile: '/test.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
      });

      await saveCheckpoint(checkpoint, nestedPath);

      const exists = await checkpointExists(nestedPath);
      expect(exists).toBe(true);
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint from file', async () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '67890',
        articlesProcessed: 500,
        totalArticles: 500,
        strategy: 'chunked',
        dumpFile: '/path/to/another-dump.xml',
        dumpDate: '20260211',
        embeddingModel: 'text-embedding-3-large',
        collectionName: 'wiki-chunked-20260211',
        timestamp: '2026-02-11T12:00:00.000Z',
      };

      await saveCheckpoint(checkpoint, testCheckpointPath);
      const loaded = await loadCheckpoint(testCheckpointPath);

      expect(loaded).toEqual(checkpoint);
    });

    it('should throw error if checkpoint file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.json');

      await expect(loadCheckpoint(nonExistentPath)).rejects.toThrow(
        'Checkpoint file not found'
      );
    });

    it('should throw error if checkpoint is invalid JSON', async () => {
      await fs.writeFile(testCheckpointPath, 'invalid json', 'utf-8');

      await expect(loadCheckpoint(testCheckpointPath)).rejects.toThrow(
        'Failed to load checkpoint'
      );
    });

    it('should throw error if required fields are missing', async () => {
      const incomplete = {
        lastArticleId: '123',
        // Missing other required fields
      };

      await fs.writeFile(
        testCheckpointPath,
        JSON.stringify(incomplete),
        'utf-8'
      );

      await expect(loadCheckpoint(testCheckpointPath)).rejects.toThrow(
        'Invalid checkpoint: missing fields'
      );
    });
  });

  describe('checkpointExists', () => {
    it('should return true if checkpoint file exists', async () => {
      await fs.writeFile(testCheckpointPath, '{}', 'utf-8');

      const exists = await checkpointExists(testCheckpointPath);
      expect(exists).toBe(true);
    });

    it('should return false if checkpoint file does not exist', async () => {
      const exists = await checkpointExists(testCheckpointPath);
      expect(exists).toBe(false);
    });
  });

  describe('validateCheckpoint', () => {
    it('should return true if checkpoint matches parameters', () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '123',
        articlesProcessed: 10,
        totalArticles: 10,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: new Date().toISOString(),
      };

      const params = {
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
      };

      const isValid = validateCheckpoint(checkpoint, params);
      expect(isValid).toBe(true);
    });

    it('should return false if strategy does not match', () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '123',
        articlesProcessed: 10,
        totalArticles: 10,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: new Date().toISOString(),
      };

      const params = {
        strategy: 'chunked', // Different strategy
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
      };

      const isValid = validateCheckpoint(checkpoint, params);
      expect(isValid).toBe(false);
    });

    it('should return false if dump file does not match', () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '123',
        articlesProcessed: 10,
        totalArticles: 10,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: new Date().toISOString(),
      };

      const params = {
        strategy: 'paragraph',
        dumpFile: '/different/dump.xml', // Different file
        dumpDate: '20260210',
      };

      const isValid = validateCheckpoint(checkpoint, params);
      expect(isValid).toBe(false);
    });

    it('should return false if dump date does not match', () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '123',
        articlesProcessed: 10,
        totalArticles: 10,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: new Date().toISOString(),
      };

      const params = {
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260211', // Different date
      };

      const isValid = validateCheckpoint(checkpoint, params);
      expect(isValid).toBe(false);
    });
  });

  describe('getCheckpointPath', () => {
    it('should generate checkpoint path with strategy', () => {
      const checkpointPath = getCheckpointPath('paragraph');
      expect(checkpointPath).toBe('indexing-checkpoint-paragraph.json');
    });

    it('should use custom base directory', () => {
      const checkpointPath = getCheckpointPath('chunked', '/custom/dir');
      expect(checkpointPath).toBe('/custom/dir/indexing-checkpoint-chunked.json');
    });

    it('should sanitize strategy for checkpoint path safety', () => {
      const checkpointPath = getCheckpointPath('chunked/v2');
      expect(checkpointPath).toBe('indexing-checkpoint-chunked-v2.json');
    });
  });

  describe('createInitialCheckpoint', () => {
    it('should create initial checkpoint with zero progress', () => {
      const checkpoint = createInitialCheckpoint({
        strategy: 'paragraph',
        dumpFile: '/test.xml',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
      });

      expect(checkpoint.lastArticleId).toBe('0');
      expect(checkpoint.articlesProcessed).toBe(0);
      expect(checkpoint.totalArticles).toBe(0);
      expect(checkpoint.strategy).toBe('paragraph');
      expect(checkpoint.dumpFile).toBe('/test.xml');
      expect(checkpoint.timestamp).toBeDefined();
    });
  });

  describe('getCheckpointMetadata', () => {
    it('should extract metadata subset using Ramda', () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '123',
        articlesProcessed: 100,
        totalArticles: 1000,
        strategy: 'paragraph',
        dumpFile: '/test.xml',
        dumpDate: '20260210',
        embeddingModel: 'test-model',
        collectionName: 'test-collection',
        timestamp: '2026-02-11T00:00:00.000Z',
      };

      const metadata = getCheckpointMetadata(checkpoint);

      expect(metadata).toEqual({
        lastArticleId: '123',
        articlesProcessed: 100,
        strategy: 'paragraph',
        dumpDate: '20260210',
        timestamp: '2026-02-11T00:00:00.000Z',
      });

      // Should not include other fields
      expect(metadata).not.toHaveProperty('dumpFile');
      expect(metadata).not.toHaveProperty('embeddingModel');
    });
  });

  describe('completedBlockOffsets (multistream resume)', () => {
    it('should save and load completedBlockOffsets', async () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '42',
        articlesProcessed: 300,
        totalArticles: 300,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml.bz2',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
        timestamp: '2026-02-11T00:00:00.000Z',
        completedBlockOffsets: [0, 4125, 9875],
      };

      await saveCheckpoint(checkpoint, testCheckpointPath);
      const loaded = await loadCheckpoint(testCheckpointPath);

      expect(loaded.completedBlockOffsets).toEqual([0, 4125, 9875]);
    });

    it('should load legacy checkpoint without completedBlockOffsets as undefined', async () => {
      // Simulate an old checkpoint file that predates multistream support
      const legacyCheckpoint = {
        lastArticleId: '10',
        articlesProcessed: 100,
        totalArticles: 100,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
        timestamp: '2026-02-11T00:00:00.000Z',
        // no completedBlockOffsets field
      };

      await fs.writeFile(testCheckpointPath, JSON.stringify(legacyCheckpoint), 'utf-8');
      const loaded = await loadCheckpoint(testCheckpointPath);

      expect(loaded.completedBlockOffsets).toBeUndefined();
    });

    it('should save checkpoint with empty completedBlockOffsets array', async () => {
      const checkpoint: CheckpointData = {
        lastArticleId: '0',
        articlesProcessed: 0,
        totalArticles: 0,
        strategy: 'paragraph',
        dumpFile: '/path/to/dump.xml.bz2',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
        timestamp: '2026-02-11T00:00:00.000Z',
        completedBlockOffsets: [],
      };

      await saveCheckpoint(checkpoint, testCheckpointPath);
      const loaded = await loadCheckpoint(testCheckpointPath);

      expect(loaded.completedBlockOffsets).toEqual([]);
    });

    it('createInitialCheckpoint should not include completedBlockOffsets', () => {
      const checkpoint = createInitialCheckpoint({
        strategy: 'paragraph',
        dumpFile: '/test.xml.bz2',
        dumpDate: '20260210',
        embeddingModel: 'text-embedding-3-small',
        collectionName: 'wiki-paragraph-20260210',
      });

      expect(checkpoint.completedBlockOffsets).toBeUndefined();
    });
  });
});
