import * as R from 'ramda';
import type { Section } from './types.js';

/**
 * Check if a line is a section header (== Section Name ==)
 */
const isSectionHeader = R.test(/^={2,6}[^=]+={2,6}$/);

/**
 * Extract section name from header line
 * Removes leading and trailing equals signs and whitespace
 */
const extractSectionName = R.pipe(
  R.replace(/^=+\s*/, ''),
  R.replace(/\s*=+$/, ''),
  R.trim
);

/**
 * Extract section level from header line (count of = signs)
 * Level 2 is ==, level 3 is ===, etc.
 */
const extractSectionLevel = (line: string): number => {
  const matches = line.match(/^=+/);
  return matches ? matches[0].length : 0;
};

/**
 * Parse Wikipedia wikitext into sections
 * Sections are marked with == Section Name == (level 2) or higher
 *
 * @param wikitext - Raw wikitext content
 * @returns Array of sections with name, level, and content
 *
 * @example
 * const sections = parseSections("Intro text\n\n== Section 1 ==\n\nContent");
 * // Returns: [
 * //   { name: '', level: 0, content: 'Intro text\n\n' },
 * //   { name: 'Section 1', level: 2, content: '\n\nContent' }
 * // ]
 */
export const parseSections = (wikitext: string): Section[] => {
  const lines = R.split('\n', wikitext);

  // Use R.reduce to accumulate sections while processing lines
  const sections = R.reduce(
    (acc: Section[], line: string) => {
      if (isSectionHeader(line)) {
        // Start a new section
        return R.append(
          {
            name: extractSectionName(line),
            level: extractSectionLevel(line),
            content: '',
          },
          acc
        );
      } else {
        // Append line to current section
        if (R.isEmpty(acc)) {
          // If no sections yet, create intro section
          return [{ name: '', level: 0, content: line + '\n' }];
        }

        // Append to last section
        return R.adjust(
          -1,
          (section: Section) => ({
            ...section,
            content: section.content + line + '\n',
          }),
          acc
        );
      }
    },
    [] as Section[],
    lines
  );

  // Trim trailing newline from each section's content
  return R.map(
    (section: Section): Section => ({
      ...section,
      content: R.trim(section.content) + '\n',
    }),
    sections
  );
};
