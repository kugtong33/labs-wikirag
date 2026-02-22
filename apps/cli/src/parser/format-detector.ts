/**
 * Dump file format detection and stream factory
 *
 * Auto-detects Wikipedia dump format by file extension and returns
 * the appropriate readable stream (raw or bz2-decompressed).
 *
 * @module parser/format-detector
 */

import * as fs from 'fs';
import { createBz2ReadStream } from './bz2-stream.js';
import { WikipediaParserError } from './errors.js';

/**
 * Supported dump file formats
 */
export type DumpFormat = 'xml' | 'bz2';

/**
 * Detect dump file format from file extension.
 *
 * @param filePath - Path to Wikipedia dump file
 * @returns Detected format: 'xml' or 'bz2'
 * @throws WikipediaParserError for unsupported file extensions
 */
export function detectDumpFormat(filePath: string): DumpFormat {
  if (filePath.endsWith('.xml.bz2') || filePath.endsWith('.bz2')) {
    return 'bz2';
  }

  if (filePath.endsWith('.xml')) {
    return 'xml';
  }

  throw new WikipediaParserError(
    `Unsupported dump format for file: ${filePath}. Expected .xml or .xml.bz2 extension.`,
    'detectDumpFormat'
  );
}

/**
 * Create the appropriate readable stream for a Wikipedia dump file.
 *
 * Auto-detects format by extension:
 * - .xml        → raw fs.createReadStream (encoding: utf8)
 * - .xml.bz2    → bz2 decompression stream piped from fs.createReadStream
 *
 * @param filePath - Path to Wikipedia dump file
 * @param options - Optional byte range for multistream block reads (bz2 only)
 * @returns ReadableStream of XML content (decompressed if bz2)
 */
export function createDumpStream(
  filePath: string,
  options?: { start?: number; end?: number }
): NodeJS.ReadableStream {
  const format = detectDumpFormat(filePath);

  if (format === 'bz2') {
    return createBz2ReadStream(filePath, options);
  }

  // Plain XML — encoding: utf8 so stream emits strings (matches existing behavior)
  return fs.createReadStream(filePath, { encoding: 'utf8' });
}
