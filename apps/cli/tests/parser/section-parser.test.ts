import { describe, it, expect } from 'vitest';
import { parseSections } from '../../src/parser/section-parser.js';

describe('SectionParser', () => {
  describe('parseSections', () => {
    it('should parse intro and one section', () => {
      const wikitext = `Intro paragraph here.

== Section One ==

Section content goes here.`;

      const sections = parseSections(wikitext);

      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('');
      expect(sections[0].level).toBe(0);
      expect(sections[0].content).toContain('Intro paragraph');

      expect(sections[1].name).toBe('Section One');
      expect(sections[1].level).toBe(2);
      expect(sections[1].content).toContain('Section content');
    });

    it('should parse multiple sections', () => {
      const wikitext = `Intro text.

== First Section ==

First content.

== Second Section ==

Second content.`;

      const sections = parseSections(wikitext);

      expect(sections).toHaveLength(3);
      expect(sections[0].name).toBe('');
      expect(sections[1].name).toBe('First Section');
      expect(sections[2].name).toBe('Second Section');
    });

    it('should parse different section levels', () => {
      const wikitext = `== Level 2 ==
Content 2

=== Level 3 ===
Content 3

==== Level 4 ====
Content 4`;

      const sections = parseSections(wikitext);

      expect(sections[0].level).toBe(2);
      expect(sections[1].level).toBe(3);
      expect(sections[2].level).toBe(4);
    });

    it('should handle sections with extra whitespace in headers', () => {
      const wikitext = `==  Section With Spaces  ==

Content here.`;

      const sections = parseSections(wikitext);

      expect(sections[0].name).toBe('Section With Spaces');
      expect(sections[0].level).toBe(2);
    });

    it('should handle text with no sections', () => {
      const wikitext = `Just some intro text
with multiple lines
and no sections.`;

      const sections = parseSections(wikitext);

      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('');
      expect(sections[0].level).toBe(0);
      expect(sections[0].content).toContain('Just some intro text');
    });

    it('should handle empty wikitext', () => {
      const sections = parseSections('');

      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('');
      expect(sections[0].level).toBe(0);
      expect(sections[0].content).toBe('\n');
    });

    it('should handle wikitext starting with section', () => {
      const wikitext = `== First Section ==

Content without intro.`;

      const sections = parseSections(wikitext);

      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('First Section');
      expect(sections[0].level).toBe(2);
    });

    it('should preserve newlines within sections', () => {
      const wikitext = `== Section ==

Line 1

Line 2

Line 3`;

      const sections = parseSections(wikitext);

      expect(sections[0].content).toContain('Line 1');
      expect(sections[0].content).toContain('Line 2');
      expect(sections[0].content).toContain('Line 3');
    });

    it('should handle nested subsections', () => {
      const wikitext = `== Main Section ==

Main content.

=== Subsection ===

Sub content.`;

      const sections = parseSections(wikitext);

      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('Main Section');
      expect(sections[0].level).toBe(2);
      expect(sections[1].name).toBe('Subsection');
      expect(sections[1].level).toBe(3);
    });

    describe('edge cases', () => {
      it('should not treat invalid headers as sections', () => {
        const wikitext = `= One Equal =
Not a valid header

== Valid Section ==
Content`;

        const sections = parseSections(wikitext);

        expect(sections).toHaveLength(2);
        expect(sections[0].name).toBe(''); // Intro with invalid header
        expect(sections[1].name).toBe('Valid Section');
      });

      it('should handle sections with special characters', () => {
        const wikitext = `== Section: Special & Characters! ==

Content.`;

        const sections = parseSections(wikitext);

        expect(sections[0].name).toBe('Section: Special & Characters!');
      });
    });
  });
});
