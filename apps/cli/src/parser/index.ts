/**
 * Wikipedia XML Streaming Parser
 *
 * Parses Wikipedia XML dump files with bounded memory usage using Node.js streams
 * and fast-xml-parser. Extracts paragraphs with metadata (title, section, position).
 *
 * @packageDocumentation
 */

// Main parser function
export { parseWikipediaDump } from './wikipedia-parser.js';

// Type definitions
export type {
  WikipediaParagraph,
  WikipediaPage,
  Section,
  ParserOptions,
} from './types.js';

// Error class
export { WikipediaParserError } from './errors.js';

// Utility functions (for advanced usage)
export { streamXmlPages } from './xml-stream.js';
export { parseSections } from './section-parser.js';
export { extractParagraphsFromSection } from './paragraph-extractor.js';
export { cleanWikitext } from './wikitext-cleaner.js';

// Bz2 and multistream support
export { createBz2ReadStream } from './bz2-stream.js';
export { detectDumpFormat, createDumpStream, type DumpFormat } from './format-detector.js';
export {
  parseMultistreamIndex,
  parseMultistreamBlocks,
  getStreamBlocks,
  type MultistreamBlock,
  type StreamBlockRange,
} from './multistream-index.js';
export { readMultistreamParallel } from './parallel-stream-reader.js';
