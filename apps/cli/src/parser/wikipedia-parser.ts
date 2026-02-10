import * as R from 'ramda';
import { streamXmlPages } from './xml-stream.js';
import { parseSections } from './section-parser.js';
import { extractParagraphsFromSection } from './paragraph-extractor.js';
import type { WikipediaParagraph, ParserOptions } from './types.js';
import { WikipediaParserError } from './errors.js';

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: Required<ParserOptions> = {
  skipRedirects: true,
  minParagraphLength: 10,
  debug: false,
};

/**
 * Parse Wikipedia XML dump file and stream paragraphs with metadata
 *
 * This is the main entry point for the Wikipedia parser.
 * Uses async generator pattern to maintain bounded memory usage.
 *
 * **Memory Efficiency:**
 * - Processes one page at a time (no accumulation)
 * - Yields paragraphs individually
 * - Memory usage stays constant regardless of file size
 *
 * **Pipeline:**
 * 1. Stream XML pages from file
 * 2. Skip redirects (if enabled)
 * 3. Parse wikitext into sections
 * 4. Extract paragraphs from each section
 * 5. Yield paragraphs one at a time
 *
 * @param filePath - Path to Wikipedia XML dump file
 * @param options - Parser configuration options
 * @yields WikipediaParagraph objects with metadata
 *
 * @example
 * for await (const paragraph of parseWikipediaDump('enwiki-dump.xml')) {
 *   console.log(paragraph.articleTitle, paragraph.sectionName, paragraph.content);
 * }
 *
 * @example
 * // With custom options
 * for await (const paragraph of parseWikipediaDump('dump.xml', {
 *   skipRedirects: false,
 *   minParagraphLength: 20,
 *   debug: true
 * })) {
 *   // Process paragraph
 * }
 */
export async function* parseWikipediaDump(
  filePath: string,
  options: ParserOptions = {}
): AsyncGenerator<WikipediaParagraph, void, unknown> {
  // Merge options with defaults using Ramda
  const opts = R.mergeRight(DEFAULT_OPTIONS, options);

  try {
    let pagesProcessed = 0;
    let redirectsSkipped = 0;

    // Stream pages from XML file
    for await (const page of streamXmlPages(filePath)) {
      // Skip redirects if configured
      if (opts.skipRedirects && page.isRedirect) {
        redirectsSkipped++;
        if (opts.debug) {
          console.log(`Skipping redirect: ${page.title}`);
        }
        continue;
      }

      try {
        // Parse wikitext into sections
        const sections = parseSections(page.text);

        // Extract paragraphs from each section
        for (const section of sections) {
          const paragraphs = extractParagraphsFromSection(
            page.title,
            section.name,
            section.content,
            opts.minParagraphLength
          );

          // Yield each paragraph individually (streaming behavior)
          for (const paragraph of paragraphs) {
            yield paragraph;
          }
        }

        pagesProcessed++;
        if (opts.debug && pagesProcessed % 100 === 0) {
          console.log(`Processed ${pagesProcessed} pages, skipped ${redirectsSkipped} redirects`);
        }
      } catch (error) {
        // Log error but continue processing other pages
        if (opts.debug) {
          console.warn(`Error processing page "${page.title}": ${error}`);
        }
        continue;
      }
    }

    if (opts.debug) {
      console.log(`
Parsing complete:
- Pages processed: ${pagesProcessed}
- Redirects skipped: ${redirectsSkipped}
      `);
    }
  } catch (error) {
    throw new WikipediaParserError(
      `Failed to parse Wikipedia dump: ${filePath}`,
      'parseWikipediaDump',
      undefined,
      error as Error
    );
  }
}
