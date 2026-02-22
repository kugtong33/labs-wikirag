/**
 * Wikipedia multistream bz2 index parser
 *
 * Parses the Wikipedia multistream index file
 * (enwiki-latest-pages-articles-multistream-index.txt.bz2)
 * to extract block boundaries for parallel decompression.
 *
 * Index format (one line per article):
 *   byteOffset:articleId:articleTitle
 *
 * Each unique byteOffset marks the start of a bz2 stream containing ~100 pages.
 *
 * @module parser/multistream-index
 */

import * as R from 'ramda';
import { createBz2ReadStream } from './bz2-stream.js';
import { WikipediaParserError } from './errors.js';

/**
 * A single entry from the multistream index file
 */
export interface MultistreamBlock {
  /** Byte offset into the .xml.bz2 dump file where this stream starts */
  byteOffset: number;
  /** Wikipedia article ID */
  articleId: string;
  /** Wikipedia article title */
  articleTitle: string;
}

/**
 * A decompressible stream block with byte range
 */
export interface StreamBlockRange {
  /** Byte offset where this bz2 stream starts in the dump file */
  byteOffset: number;
  /** Byte offset where this bz2 stream ends (inclusive), or -1 for last block */
  endOffset: number;
  /** Article IDs contained in this block */
  articleIds: string[];
}

/**
 * Parse the Wikipedia multistream index file.
 *
 * Supports both compressed (.txt.bz2) and uncompressed (.txt) index files.
 *
 * @param indexFilePath - Path to the multistream index file
 * @returns Array of index entries sorted by byteOffset
 */
export async function parseMultistreamIndex(
  indexFilePath: string
): Promise<MultistreamBlock[]> {
  try {
    const stream = indexFilePath.endsWith('.bz2')
      ? createBz2ReadStream(indexFilePath)
      : await (async () => {
          const { createReadStream } = await import('fs');
          return createReadStream(indexFilePath, { encoding: 'utf8' });
        })();

    const blocks: MultistreamBlock[] = [];
    let lineBuffer = '';

    for await (const chunk of stream) {
      lineBuffer += typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf8');

      // Process complete lines
      const lines = lineBuffer.split('\n');
      // Keep last (potentially incomplete) line in buffer
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const entry = parseLine(line);
        if (entry) blocks.push(entry);
      }
    }

    // Process any remaining content
    if (lineBuffer.trim()) {
      const entry = parseLine(lineBuffer);
      if (entry) blocks.push(entry);
    }

    // Sort by byteOffset to ensure deterministic block ordering
    return R.sortBy(R.prop('byteOffset'), blocks);
  } catch (error) {
    if (error instanceof WikipediaParserError) throw error;
    throw new WikipediaParserError(
      `Failed to parse multistream index: ${indexFilePath}`,
      'parseMultistreamIndex',
      undefined,
      error as Error
    );
  }
}

/**
 * Parse a single index file line into a MultistreamBlock entry.
 * Format: byteOffset:articleId:articleTitle
 *
 * @param line - Raw index file line
 * @returns Parsed entry or null if line is invalid/empty
 */
function parseLine(line: string): MultistreamBlock | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Split on first two colons only (title may contain colons)
  const firstColon = trimmed.indexOf(':');
  if (firstColon === -1) return null;

  const secondColon = trimmed.indexOf(':', firstColon + 1);
  if (secondColon === -1) return null;

  const byteOffsetStr = trimmed.slice(0, firstColon);
  const articleId = trimmed.slice(firstColon + 1, secondColon);
  const articleTitle = trimmed.slice(secondColon + 1);

  const byteOffset = parseInt(byteOffsetStr, 10);
  if (isNaN(byteOffset) || !articleId || !articleTitle) return null;

  return { byteOffset, articleId, articleTitle };
}

/**
 * Build stream block ranges from parsed index entries.
 *
 * Groups entries by byteOffset to determine block boundaries.
 * Each block's endOffset is the next block's byteOffset - 1.
 * The last block gets endOffset = -1 (read to end of file).
 *
 * @param entries - Sorted index entries from parseMultistreamIndex
 * @returns Array of StreamBlockRange objects
 */
export function getStreamBlocks(entries: MultistreamBlock[]): StreamBlockRange[] {
  if (R.isEmpty(entries)) return [];

  // Group entries by byteOffset using Ramda
  const grouped = R.groupBy<MultistreamBlock>(
    (entry) => String(entry.byteOffset),
    entries
  );

  // Get sorted unique offsets
  const uniqueOffsets = R.pipe(
    R.pluck('byteOffset') as (entries: MultistreamBlock[]) => number[],
    R.uniq,
    R.sort<number>(R.subtract)
  )(entries);

  // Build block ranges
  return R.addIndex<number, StreamBlockRange>(R.map)(
    (offset: number, i: number) => {
      const nextOffset = uniqueOffsets[i + 1];
      const blockEntries = grouped[String(offset)] ?? [];
      return {
        byteOffset: offset,
        endOffset: nextOffset !== undefined ? nextOffset - 1 : -1,
        articleIds: R.pluck('articleId', blockEntries),
      };
    },
    uniqueOffsets
  );
}
