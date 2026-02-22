/**
 * Bz2 streaming decompression for Wikipedia dump files
 *
 * Wraps unbzip2-stream to provide a streaming decompression pipeline
 * that can be piped into the existing XML stream parser.
 *
 * @module parser/bz2-stream
 */

import * as fs from 'fs';
import { createRequire } from 'module';
import { WikipediaParserError } from './errors.js';

// CJS interop: unbzip2-stream is a CommonJS module
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const unbzip2Stream = require('unbzip2-stream') as () => NodeJS.ReadWriteStream;

/**
 * Create a streaming decompression pipeline from a bz2-compressed file.
 *
 * Pipes the file read stream through unbzip2-stream without writing
 * decompressed data to disk. Memory usage stays bounded.
 *
 * @param filePath - Path to .xml.bz2 file
 * @param options - Optional byte range for multistream block decompression
 * @returns A readable stream of decompressed XML content
 */
export function createBz2ReadStream(
  filePath: string,
  options?: { start?: number; end?: number }
): NodeJS.ReadableStream {
  try {
    if (!fs.existsSync(filePath)) {
      throw new WikipediaParserError(
        `Bz2 file does not exist: ${filePath}`,
        'createBz2ReadStream'
      );
    }

    const readStream = options
      ? fs.createReadStream(filePath, options)
      : fs.createReadStream(filePath);

    const decompressStream = unbzip2Stream();

    readStream.on('error', (err) => {
      (decompressStream as NodeJS.ReadWriteStream & { destroy: (err?: Error) => void }).destroy(
        new WikipediaParserError(
          `Failed to read bz2 file: ${err.message}`,
          'createBz2ReadStream',
          undefined,
          err
        )
      );
    });

    return readStream.pipe(decompressStream);
  } catch (error) {
    throw new WikipediaParserError(
      `Failed to create bz2 read stream for: ${filePath}`,
      'createBz2ReadStream',
      undefined,
      error as Error
    );
  }
}
