/**
 * Tests for format-detector module
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { detectDumpFormat, createDumpStream } from '../../src/parser/format-detector.js';

/** Collect all chunks from a readable stream into a string */
function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

describe('format-detector', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('detectDumpFormat', () => {
    it('should return bz2 for .xml.bz2 files', () => {
      expect(detectDumpFormat('/path/to/dump.xml.bz2')).toBe('bz2');
    });

    it('should return xml for .xml files', () => {
      expect(detectDumpFormat('/path/to/dump.xml')).toBe('xml');
    });

    it('should throw for unsupported extensions', () => {
      expect(() => detectDumpFormat('/path/to/dump.txt')).toThrow();
      expect(() => detectDumpFormat('/path/to/dump')).toThrow();
    });

    it('should handle filenames without directories', () => {
      expect(detectDumpFormat('dump.xml.bz2')).toBe('bz2');
      expect(detectDumpFormat('dump.xml')).toBe('xml');
    });
  });

  describe('createDumpStream', () => {
    it('should create a readable stream for a plain .xml file', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml');
      const stream = createDumpStream(filePath);
      expect(stream).toBeDefined();

      const content = await streamToString(stream);
      expect(content).toContain('Test Article');
    });

    it('should create a decompressed stream for a .xml.bz2 file', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml.bz2');
      const stream = createDumpStream(filePath);
      expect(stream).toBeDefined();

      const content = await streamToString(stream);
      expect(content).toContain('Test Article');
      expect(content).toContain('<page>');
    });
  });
});
