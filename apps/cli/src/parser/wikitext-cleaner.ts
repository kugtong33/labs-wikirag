import * as R from 'ramda';

/**
 * Clean wiki links: [[Link|Display Text]] → Display Text or [[Link]] → Link
 */
const cleanWikiLinks = R.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1');

/**
 * Remove wiki templates: {{anything}}
 */
const removeTemplatesOnce = R.replace(/\{\{[^{}]*\}\}/g, '');

/**
 * Remove nested templates by repeatedly applying the regex
 */
const removeTemplates = (input: string): string => {
  const stripOnce = (text: string) => removeTemplatesOnce(text);
  const isStable = (text: string) => stripOnce(text) === text;
  return R.until(isStable, stripOnce)(input);
};

/**
 * Remove reference tags: <ref>...</ref> or <ref />
 */
const removeRefs = R.replace(/<ref[^>]*>.*?<\/ref>|<ref[^>]*\/>/gs, '');

/**
 * Remove bold and italic formatting markers
 */
const removeFormatting = R.pipe(
  R.replace(/'''/g, ''),  // Remove bold '''
  R.replace(/''/g, '')     // Remove italic ''
);

/**
 * Clean Wikipedia markup from wikitext
 * Uses Ramda.pipe to compose transformation functions
 *
 * @param wikitext - Raw wikitext content
 * @returns Cleaned plain text
 *
 * @example
 * cleanWikitext("Visit [[Paris|the city]].")
 * // Returns: "Visit the city."
 *
 * cleanWikitext("'''Bold''' text with {{template}}.")
 * // Returns: "Bold text with ."
 */
export const cleanWikitext = R.pipe(
  cleanWikiLinks,
  removeTemplates,
  removeRefs,
  removeFormatting,
  R.trim
);
