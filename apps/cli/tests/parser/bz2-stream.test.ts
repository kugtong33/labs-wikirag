/**
 * Tests for bz2-stream module
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { createBz2ReadStream } from '../../src/parser/bz2-stream.js';

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

describe('bz2-stream', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('createBz2ReadStream', () => {
    it('should decompress a .bz2 file into a readable stream', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml.bz2');
      const stream = createBz2ReadStream(filePath);

      const content = await streamToString(stream);
      expect(content).toContain('<page>');
      expect(content).toContain('Test Article');
    });

    it('should produce identical content to the original xml file', async () => {
      const { createReadStream } = await import('fs');
      const xmlPath = path.join(fixturesDir, 'simple-article.xml');
      const bz2Path = path.join(fixturesDir, 'simple-article.xml.bz2');

      // Read original xml
      const xmlStream = createReadStream(xmlPath, { encoding: 'utf8' });
      const xmlContent = await streamToString(xmlStream);

      // Read and decompress bz2
      const bz2Stream = createBz2ReadStream(bz2Path);
      const bz2Content = await streamToString(bz2Stream);

      expect(bz2Content).toBe(xmlContent);
    });

    it('should throw WikipediaParserError for a non-existent file', async () => {
      expect(() => createBz2ReadStream('/nonexistent/file.xml.bz2')).toThrow();
    });
  });
});
