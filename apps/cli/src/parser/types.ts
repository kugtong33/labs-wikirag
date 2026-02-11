/**
 * A Wikipedia paragraph with metadata
 * This is the core data structure yielded by the streaming parser
 */
export interface WikipediaParagraph {
  /** Article title from <title> element */
  articleTitle: string;

  /** Article ID from <id> element */
  articleId: string;

  /** Section name from == Section == markers, empty string if no section */
  sectionName: string;

  /** 0-based position within the section */
  paragraphPosition: number;

  /** Cleaned paragraph content (wikitext markup removed) */
  content: string;
}

/**
 * Raw Wikipedia page data extracted from XML
 * Used internally before paragraph extraction
 */
export interface WikipediaPage {
  /** Page title */
  title: string;

  /** Page ID */
  id: string;

  /** Whether this is a redirect page */
  isRedirect: boolean;

  /** Raw wikitext content */
  text: string;
}

/**
 * Section data extracted from wikitext
 * Sections are marked with == Section Name == in wikitext
 */
export interface Section {
  /** Section title, empty string for introduction */
  name: string;

  /** Heading level (0 for intro, 2-6 for sections) */
  level: number;

  /** Section text content */
  content: string;
}

/**
 * Parser configuration options
 */
export interface ParserOptions {
  /** Skip redirect pages (default: true) */
  skipRedirects?: boolean;

  /** Minimum paragraph length in characters (default: 10) */
  minParagraphLength?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}
