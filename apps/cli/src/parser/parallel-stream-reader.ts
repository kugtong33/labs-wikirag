/**
 * Parallel multistream bz2 decompression and parsing
 *
 * Processes Wikipedia multistream bz2 dump blocks concurrently,
 * yielding WikipediaParagraph objects in block order.
 *
 * @module parser/parallel-stream-reader
 */

import * as R from 'ramda';
import { streamXmlPages } from './xml-stream.js';
import { parseSections } from './section-parser.js';
import { extractParagraphsFromSection } from './paragraph-extractor.js';
import { createBz2ReadStream } from './bz2-stream.js';
import type { WikipediaParagraph, ParserOptions } from './types.js';
import type { StreamBlockRange } from './multistream-index.js';
import { WikipediaParserError } from './errors.js';

type BlockCompleteCallback = (block: StreamBlockRange) => Promise<void> | void;

const DEFAULT_OPTIONS: Required<ParserOptions> = {
  skipRedirects: true,
  minParagraphLength: 10,
  debug: false,
};

/**
 * Decompress and parse a single bz2 stream block into paragraphs.
 *
 * @param dumpFilePath - Path to the .xml.bz2 dump file
 * @param block - Stream block range with byte offsets
 * @param options - Parser options
 * @returns Array of paragraphs from this block
 */
async function parseBlock(
  dumpFilePath: string,
  block: StreamBlockRange,
  options: Required<ParserOptions>
): Promise<WikipediaParagraph[]> {
  const streamOptions =
    block.endOffset === -1
      ? { start: block.byteOffset }
      : { start: block.byteOffset, end: block.endOffset };

  const bz2Stream = createBz2ReadStream(dumpFilePath, streamOptions);
  const paragraphs: WikipediaParagraph[] = [];

  for await (const page of streamXmlPages(bz2Stream)) {
    if (options.skipRedirects && page.isRedirect) continue;

    try {
      const sections = parseSections(page.text);
      for (const section of sections) {
        const extracted = extractParagraphsFromSection(
          page.title,
          section.name,
          section.content,
          options.minParagraphLength
        );
        for (const paragraph of extracted) {
          paragraphs.push({ ...paragraph, articleId: page.id });
        }
      }
    } catch {
      // Skip malformed pages, continue
      continue;
    }
  }

  return paragraphs;
}

/**
 * Read a Wikipedia multistream bz2 dump in parallel.
 *
 * Processes blocks in batches of `concurrency` size. Paragraphs are
 * yielded in block order — no interleaving between workers.
 *
 * @param dumpFilePath - Path to the .xml.bz2 dump file
 * @param blocks - Stream block ranges from getStreamBlocks()
 * @param concurrency - Number of blocks to decompress in parallel (default: 1)
 * @param options - Parser options
 * @yields WikipediaParagraph objects in block order
 */
export async function* readMultistreamParallel(
  dumpFilePath: string,
  blocks: StreamBlockRange[],
  concurrency: number = 1,
  options: ParserOptions = {},
  onBlockComplete?: BlockCompleteCallback,
): AsyncGenerator<WikipediaParagraph, void, unknown> {
  if (R.isEmpty(blocks)) return;

  const opts = R.mergeRight(DEFAULT_OPTIONS, options) as Required<ParserOptions>;
  const safeConcurrency = Math.max(1, concurrency);

  try {
    // Launch up to N workers and keep a rolling in-flight window.
    // This removes batch barriers while preserving deterministic block-order output.
    const inFlight = new Map<number, Promise<WikipediaParagraph[]>>();

    const initialLaunches = Math.min(safeConcurrency, blocks.length);
    for (let index = 0; index < initialLaunches; index += 1) {
      inFlight.set(index, parseBlock(dumpFilePath, blocks[index], opts));
    }

    for (let yieldIndex = 0; yieldIndex < blocks.length; yieldIndex += 1) {
      const blockParagraphs = await inFlight.get(yieldIndex);
      if (!blockParagraphs) {
        throw new WikipediaParserError(
          `Missing in-flight result for block index ${yieldIndex}`,
          'readMultistreamParallel',
        );
      }

      if (onBlockComplete) {
        await onBlockComplete(blocks[yieldIndex]);
      }

      const nextLaunch = yieldIndex + safeConcurrency;
      if (nextLaunch < blocks.length) {
        inFlight.set(
          nextLaunch,
          parseBlock(dumpFilePath, blocks[nextLaunch], opts),
        );
      }

      yield* blockParagraphs;
      inFlight.delete(yieldIndex);
    }
  } catch (error) {
    if (error instanceof WikipediaParserError) throw error;
    throw new WikipediaParserError(
      `Failed during parallel multistream processing of: ${dumpFilePath}`,
      'readMultistreamParallel',
      undefined,
      error as Error
    );
  }
}
