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

type IndexChunk = string | Buffer;

/**
 * Iterate readable streams that may not implement Symbol.asyncIterator
 * (e.g. some CJS transform streams such as unbzip2-stream).
 */
async function* readChunks(stream: NodeJS.ReadableStream): AsyncGenerator<IndexChunk> {
  const asyncIterable = stream as NodeJS.ReadableStream & AsyncIterable<IndexChunk>;
  if (typeof asyncIterable[Symbol.asyncIterator] === 'function') {
    yield* asyncIterable;
    return;
  }

  const queue: IndexChunk[] = [];
  let ended = false;
  let streamError: Error | undefined;
  let notify: (() => void) | undefined;

  const wake = (): void => {
    if (notify) {
      const callback = notify;
      notify = undefined;
      callback();
    }
  };

  const onData = (chunk: IndexChunk): void => {
    queue.push(chunk);
    wake();
  };

  const onEnd = (): void => {
    ended = true;
    wake();
  };

  const onError = (err: unknown): void => {
    streamError = err instanceof Error ? err : new Error(String(err));
    ended = true;
    wake();
  };

  stream.on('data', onData);
  stream.once('end', onEnd);
  stream.once('error', onError);

  try {
    while (!ended || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
        continue;
      }

      yield queue.shift() as IndexChunk;
    }

    if (streamError) {
      throw streamError;
    }
  } finally {
    stream.off('data', onData);
    stream.off('end', onEnd);
    stream.off('error', onError);
  }
}

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
 * Parse multistream index into compact block ranges.
 *
 * This is optimized for production-scale index files: it tracks only unique
 * stream offsets while scanning line-by-line, avoiding allocation of millions
 * of per-article entries.
 */
export async function parseMultistreamBlocks(
  indexFilePath: string,
  options?: {
    progressIntervalLines?: number;
    onProgress?: (stats: { scannedLines: number; blocksDiscovered: number }) => void;
  },
): Promise<StreamBlockRange[]> {
  try {
    const progressIntervalLines = options?.progressIntervalLines ?? 250_000;

    const stream = indexFilePath.endsWith('.bz2')
      ? createBz2ReadStream(indexFilePath)
      : await (async () => {
          const { createReadStream } = await import('fs');
          return createReadStream(indexFilePath, { encoding: 'utf8' });
        })();

    const blocks: StreamBlockRange[] = [];
    let currentOffset: number | null = null;
    let lineBuffer = '';
    let scannedLines = 0;

    const emitProgress = (): void => {
      if (!options?.onProgress) {
        return;
      }

      options.onProgress({
        scannedLines,
        blocksDiscovered: blocks.length + (currentOffset === null ? 0 : 1),
      });
    };

    for await (const chunk of readChunks(stream)) {
      lineBuffer += typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf8');

      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        scannedLines += 1;

        const entry = parseLine(line);
        if (!entry) {
          if (scannedLines % progressIntervalLines === 0) emitProgress();
          continue;
        }

        if (currentOffset === null) {
          currentOffset = entry.byteOffset;
          if (scannedLines % progressIntervalLines === 0) emitProgress();
          continue;
        }

        if (entry.byteOffset === currentOffset) {
          if (scannedLines % progressIntervalLines === 0) emitProgress();
          continue;
        }

        if (entry.byteOffset < currentOffset) {
          throw new WikipediaParserError(
            `Index offsets are not sorted: ${entry.byteOffset} after ${currentOffset}`,
            'parseMultistreamBlocks',
          );
        }

        blocks.push({
          byteOffset: currentOffset,
          endOffset: entry.byteOffset - 1,
          articleIds: [],
        });

        currentOffset = entry.byteOffset;
        if (scannedLines % progressIntervalLines === 0) emitProgress();
      }
    }

    if (lineBuffer.trim()) {
      const entry = parseLine(lineBuffer);
      if (entry) {
        if (currentOffset === null) {
          currentOffset = entry.byteOffset;
        } else if (entry.byteOffset < currentOffset) {
          throw new WikipediaParserError(
            `Index offsets are not sorted: ${entry.byteOffset} after ${currentOffset}`,
            'parseMultistreamBlocks',
          );
        } else if (entry.byteOffset !== currentOffset) {
          blocks.push({
            byteOffset: currentOffset,
            endOffset: entry.byteOffset - 1,
            articleIds: [],
          });
          currentOffset = entry.byteOffset;
        }
      }
    }

    if (currentOffset !== null) {
      blocks.push({
        byteOffset: currentOffset,
        endOffset: -1,
        articleIds: [],
      });
    }

    emitProgress();

    return blocks;
  } catch (error) {
    if (error instanceof WikipediaParserError) throw error;
    throw new WikipediaParserError(
      `Failed to parse multistream index blocks: ${indexFilePath}`,
      'parseMultistreamBlocks',
      undefined,
      error as Error,
    );
  }
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

    for await (const chunk of readChunks(stream)) {
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
