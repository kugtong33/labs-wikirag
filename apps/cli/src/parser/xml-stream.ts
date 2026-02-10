import * as R from 'ramda';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import type { WikipediaPage } from './types.js';
import { WikipediaParserError } from './errors.js';

/**
 * XML Parser configuration for fast-xml-parser
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: true,
});

/**
 * Safely extract text content from revision element
 * Try both with and without #text node (depends on parser config)
 */
const extractText = (page: any): string => {
  const text = R.pathOr(null, ['revision', 'text'], page);
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && '#text' in text) return text['#text'];
  return '';
};

/**
 * Safely extract title from page element
 */
const extractTitle = (page: any): string => {
  const title = page.title;
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object' && '#text' in title) return title['#text'];
  return '';
};

/**
 * Safely extract ID from page element
 */
const extractId = R.pipe(
  R.pathOr('', ['id']),
  R.toString
);

/**
 * Check if page is a redirect (has redirect element)
 */
const isRedirect = R.pipe(
  R.pathOr(null, ['redirect']),
  R.complement(R.isNil)
);

/**
 * Stream Wikipedia pages from an XML dump file
 * Uses Node.js streams + fast-xml-parser for bounded memory
 *
 * **Approach:**
 * 1. Read file incrementally with fs.createReadStream
 * 2. Accumulate chunks until we have complete <page>...</page> elements
 * 3. Parse each page with fast-xml-parser
 * 4. Yield WikipediaPage objects one at a time
 * 5. Memory stays bounded - only one page in memory at once
 *
 * @param filePath - Path to Wikipedia XML dump file
 * @yields WikipediaPage objects
 *
 * @example
 * for await (const page of streamXmlPages('enwiki-dump.xml')) {
 *   console.log(page.title, page.isRedirect);
 * }
 */
export async function* streamXmlPages(
  filePath: string
): AsyncGenerator<WikipediaPage, void, unknown> {
  try {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });

    let buffer = '';
    const pageRegex = /<page>([\s\S]*?)<\/page>/g;

    for await (const chunk of stream) {
      buffer += chunk;

      // Extract all complete <page> elements from buffer
      let match;
      const matches: string[] = [];

      // Collect all matches first (regex.exec modifies lastIndex)
      while ((match = pageRegex.exec(buffer)) !== null) {
        matches.push(match[0]);
      }

      // Process each complete page
      for (const pageXml of matches) {
        try {
          const pageData = parser.parse(pageXml);

          // Extract page data safely with Ramda
          const page = pageData.page;
          if (!page) continue;

          yield {
            title: extractTitle(page),
            id: extractId(page),
            isRedirect: isRedirect(page),
            text: extractText(page),
          };
        } catch (error) {
          // Skip malformed pages, continue processing
          if (error instanceof Error) {
            console.warn(`Warning: Failed to parse page: ${error.message}`);
          }
          continue;
        }
      }

      // Keep only incomplete page data in buffer
      const lastPageEnd = buffer.lastIndexOf('</page>');
      if (lastPageEnd !== -1) {
        buffer = buffer.substring(lastPageEnd + 7); // 7 = length of '</page>'
      }

      // Prevent buffer from growing unbounded (safety check)
      // If buffer > 10MB and no complete pages, something is wrong
      if (buffer.length > 10 * 1024 * 1024) {
        throw new WikipediaParserError(
          'Buffer exceeded 10MB without finding complete page element',
          'streamXmlPages'
        );
      }
    }

    // Process any remaining complete page in buffer
    if (buffer.includes('</page>')) {
      const remainingPages = buffer.match(/<page>[\s\S]*?<\/page>/g) || [];
      for (const pageXml of remainingPages) {
        try {
          const pageData = parser.parse(pageXml);
          const page = pageData.page;
          if (!page) continue;

          yield {
            title: extractTitle(page),
            id: extractId(page),
            isRedirect: isRedirect(page),
            text: extractText(page),
          };
        } catch (error) {
          // Skip malformed pages
          continue;
        }
      }
    }
  } catch (error) {
    if (error instanceof WikipediaParserError) {
      throw error;
    }
    throw new WikipediaParserError(
      `Failed to stream XML pages from ${filePath}`,
      'streamXmlPages',
      undefined,
      error as Error
    );
  }
}
