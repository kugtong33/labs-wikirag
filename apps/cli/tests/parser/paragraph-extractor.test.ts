import { describe, it, expect } from 'vitest';
import { extractParagraphsFromSection } from '../../src/parser/paragraph-extractor.js';

describe('ParagraphExtractor', () => {
  describe('extractParagraphsFromSection', () => {
    it('should extract multiple paragraphs', () => {
      const content = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.';
      const paragraphs = extractParagraphsFromSection('Test Article', 'Test Section', content);

      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0].paragraphPosition).toBe(0);
      expect(paragraphs[0].content).toBe('First paragraph here.');
      expect(paragraphs[1].paragraphPosition).toBe(1);
      expect(paragraphs[1].content).toBe('Second paragraph here.');
      expect(paragraphs[2].paragraphPosition).toBe(2);
      expect(paragraphs[2].content).toBe('Third paragraph here.');
    });

    it('should include article title and section name in metadata', () => {
      const content = 'Paragraph content.';
      const paragraphs = extractParagraphsFromSection('Paris', 'History', content);

      expect(paragraphs[0].articleTitle).toBe('Paris');
      expect(paragraphs[0].sectionName).toBe('History');
    });

    it('should filter empty paragraphs', () => {
      const content = 'First paragraph.\n\n\n\n\n\nSecond paragraph.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].content).toBe('First paragraph.');
      expect(paragraphs[1].content).toBe('Second paragraph.');
    });

    it('should apply minimum length filter', () => {
      const content = 'Hi\n\nThis is a much longer paragraph with more content.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content, 10);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].content).toContain('longer paragraph');
    });

    it('should use default minimum length of 10', () => {
      const content = 'Short\n\nThis is longer than ten characters.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].content).toContain('longer than ten');
    });

    it('should clean wikitext markup in paragraphs', () => {
      const content = 'Visit [[Paris|the city]] for tourism.\n\nThe city has over 2 million<ref>Source</ref> residents.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].content).toBe('Visit the city for tourism.');
      expect(paragraphs[1].content).toBe('The city has over 2 million residents.');
    });

    it('should handle paragraphs with complex markup', () => {
      const content = `'''Paris''' is the [[capital city|capital]] of [[France]].{{cite web|url=example.com}}

The city is known for the [[Eiffel Tower]].`;

      const paragraphs = extractParagraphsFromSection('Paris', '', content);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].content).toBe('Paris is the capital of France.');
      expect(paragraphs[1].content).toBe('The city is known for the Eiffel Tower.');
    });

    it('should handle single paragraph', () => {
      const content = 'Only one paragraph here.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].paragraphPosition).toBe(0);
    });

    it('should handle empty content', () => {
      const paragraphs = extractParagraphsFromSection('Article', 'Section', '');

      expect(paragraphs).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n   \n\n   ';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(0);
    });

    it('should handle paragraph numbering correctly', () => {
      const content = 'Paragraph number zero.\n\nParagraph number one.\n\nParagraph number two.\n\nParagraph number three.\n\nParagraph number four.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs).toHaveLength(5);
      paragraphs.forEach((para, index) => {
        expect(para.paragraphPosition).toBe(index);
      });
    });

    it('should handle introduction section (empty section name)', () => {
      const content = 'Introduction paragraph.';
      const paragraphs = extractParagraphsFromSection('Article', '', content);

      expect(paragraphs[0].sectionName).toBe('');
      expect(paragraphs[0].articleTitle).toBe('Article');
    });

    it('should preserve paragraph order', () => {
      const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = extractParagraphsFromSection('Article', 'Section', content);

      expect(paragraphs[0].content).toBe('First paragraph.');
      expect(paragraphs[1].content).toBe('Second paragraph.');
      expect(paragraphs[2].content).toBe('Third paragraph.');
    });
  });
});
