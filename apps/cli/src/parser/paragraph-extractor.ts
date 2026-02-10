import * as R from 'ramda';
import { cleanWikitext } from './wikitext-cleaner.js';
import type { WikipediaParagraph } from './types.js';

/**
 * Split text into paragraphs (split on double newlines)
 */
const toParagraphs = R.pipe(
  R.split(/\n\n+/),
  R.map(R.trim)
);

/**
 * Check if a paragraph is valid (not empty and meets minimum length)
 */
const isValidParagraph = (minLength: number) =>
  R.both(
    R.complement(R.isEmpty),
    R.pipe(R.length, R.gte(R.__, minLength))
  );

/**
 * Create a paragraph with metadata
 * Uses Ramda.curry for partial application
 */
const createParagraph = R.curry(
  (
    articleTitle: string,
    sectionName: string,
    position: number,
    content: string
  ): WikipediaParagraph => ({
    articleTitle,
    sectionName,
    paragraphPosition: position,
    content: cleanWikitext(content),
  })
);

/**
 * Extract paragraphs from a section with metadata
 * Paragraphs are numbered sequentially within each section (0-based)
 *
 * @param articleTitle - Wikipedia article title
 * @param sectionName - Section name (empty string for introduction)
 * @param sectionContent - Raw section content
 * @param minLength - Minimum paragraph length in characters (default: 10)
 * @returns Array of Wikipedia paragraphs with metadata
 *
 * @example
 * const paragraphs = extractParagraphsFromSection(
 *   'Paris',
 *   'History',
 *   'First paragraph.\n\nSecond paragraph.',
 *   10
 * );
 * // Returns: [
 * //   { articleTitle: 'Paris', sectionName: 'History', paragraphPosition: 0, content: 'First paragraph.' },
 * //   { articleTitle: 'Paris', sectionName: 'History', paragraphPosition: 1, content: 'Second paragraph.' }
 * // ]
 */
export const extractParagraphsFromSection = (
  articleTitle: string,
  sectionName: string,
  sectionContent: string,
  minLength: number = 10
): WikipediaParagraph[] => {
  const paragraphTexts = R.pipe(
    toParagraphs,
    R.filter(isValidParagraph(minLength))
  )(sectionContent);

  return R.addIndex<string, WikipediaParagraph>(R.map)(
    (content: string, index: number) =>
      createParagraph(articleTitle, sectionName, index, content),
    paragraphTexts
  );
};
