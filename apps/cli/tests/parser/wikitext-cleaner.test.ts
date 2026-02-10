import { describe, it, expect } from 'vitest';
import { cleanWikitext } from '../../src/parser/wikitext-cleaner.js';

describe('WikitextCleaner', () => {
  describe('cleanWikitext', () => {
    describe('wiki links', () => {
      it('should clean wiki links with display text', () => {
        const input = 'Visit [[Paris|the city]] today.';
        const expected = 'Visit the city today.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should clean simple wiki links', () => {
        const input = 'Read about [[Wikipedia]].';
        const expected = 'Read about Wikipedia.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should handle multiple wiki links', () => {
        const input = 'Both [[Paris|the city]] and [[London]] are capitals.';
        const expected = 'Both the city and London are capitals.';
        expect(cleanWikitext(input)).toBe(expected);
      });
    });

    describe('templates', () => {
      it('should remove templates', () => {
        const input = 'Text {{cite web|url=...}} more text.';
        const expected = 'Text  more text.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should remove multiple templates', () => {
        const input = 'Start {{template1}} middle {{template2}} end.';
        const expected = 'Start  middle  end.';
        expect(cleanWikitext(input)).toBe(expected);
      });
    });

    describe('reference tags', () => {
      it('should remove ref tags with content', () => {
        const input = 'Fact<ref>Source here</ref> continues.';
        const expected = 'Fact continues.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should remove self-closing ref tags', () => {
        const input = 'Fact<ref /> continues.';
        const expected = 'Fact continues.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should remove ref tags with attributes', () => {
        const input = 'Text<ref name="source">Content</ref> more text.';
        const expected = 'Text more text.';
        expect(cleanWikitext(input)).toBe(expected);
      });
    });

    describe('formatting', () => {
      it('should remove bold markers', () => {
        const input = "This is '''bold''' text.";
        const expected = 'This is bold text.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should remove italic markers', () => {
        const input = "This is ''italic'' text.";
        const expected = 'This is italic text.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should handle mixed bold and italic', () => {
        const input = "Both '''bold''' and ''italic'' here.";
        const expected = 'Both bold and italic here.';
        expect(cleanWikitext(input)).toBe(expected);
      });
    });

    describe('complex markup', () => {
      it('should handle complex nested markup', () => {
        const input = "'''Bold''' and ''italic'' with [[Link|text]] and {{template}}.";
        const expected = 'Bold and italic with text and .';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should handle realistic Wikipedia paragraph', () => {
        const input = `'''Paris''' is the [[capital city|capital]] of [[France]].{{cite web|url=example.com}} The city has over 2 million<ref>Source</ref> residents.`;
        const expected = 'Paris is the capital of France. The city has over 2 million residents.';
        expect(cleanWikitext(input)).toBe(expected);
      });

      it('should trim whitespace', () => {
        const input = '  Text with spaces  ';
        const expected = 'Text with spaces';
        expect(cleanWikitext(input)).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(cleanWikitext('')).toBe('');
      });

      it('should handle text with no markup', () => {
        const input = 'Plain text without any markup.';
        expect(cleanWikitext(input)).toBe(input);
      });

      it('should handle text with only whitespace', () => {
        expect(cleanWikitext('   ')).toBe('');
      });
    });
  });
});
