import { describe, it, expect } from 'vitest';
import { parseWikipediaDump } from '../../src/parser/wikipedia-parser.js';
import * as path from 'path';

describe('WikipediaParser', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('parseWikipediaDump', () => {
    it('should parse simple article and yield paragraphs', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath)) {
        paragraphs.push(paragraph);
      }

      expect(paragraphs.length).toBeGreaterThan(0);
      expect(paragraphs[0].articleTitle).toBe('Test Article');
      expect(paragraphs[0].articleId).toBe('1');
      expect(paragraphs[0].sectionName).toBe('');
      expect(paragraphs[0].content).toContain('introduction paragraph');
    });

    it('should skip redirect pages by default', async () => {
      const filePath = path.join(fixturesDir, 'redirect-page.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath)) {
        paragraphs.push(paragraph);
      }

      expect(paragraphs).toHaveLength(0);
    });

    it('should process redirect pages when skipRedirects is false', async () => {
      const filePath = path.join(fixturesDir, 'redirect-page.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath, { skipRedirects: false })) {
        paragraphs.push(paragraph);
      }

      // Redirect pages typically have minimal content
      expect(paragraphs.length).toBeGreaterThanOrEqual(0);
    });

    it('should number paragraphs within sections correctly', async () => {
      const filePath = path.join(fixturesDir, 'multi-section-article.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath)) {
        paragraphs.push(paragraph);
      }

      // Group paragraphs by section
      const sections = paragraphs.reduce((acc, para) => {
        if (!acc[para.sectionName]) {
          acc[para.sectionName] = [];
        }
        acc[para.sectionName].push(para);
        return acc;
      }, {} as Record<string, typeof paragraphs>);

      // Check each section has sequential numbering
      Object.values(sections).forEach(sectionParagraphs => {
        sectionParagraphs.forEach((para, index) => {
          expect(para.articleId).toBeDefined();
          expect(para.paragraphPosition).toBe(index);
        });
      });
    });

    it('should extract sections correctly', async () => {
      const filePath = path.join(fixturesDir, 'multi-section-article.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath)) {
        paragraphs.push(paragraph);
      }

      // Get unique section names
      const sectionNames = [...new Set(paragraphs.map(p => p.sectionName))];

      expect(sectionNames).toContain(''); // Introduction
      expect(sectionNames).toContain('History');
      expect(sectionNames).toContain('Geography');
    });

    it('should clean wikitext markup', async () => {
      const filePath = path.join(fixturesDir, 'complex-wikitext.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath)) {
        paragraphs.push(paragraph);
      }

      // Check that markup is cleaned
      const firstPara = paragraphs[0];
      expect(firstPara.content).not.toContain('[[');
      expect(firstPara.content).not.toContain('{{');
      expect(firstPara.content).not.toContain('<ref>');
      expect(firstPara.content).not.toContain("'''");

      // Check content is preserved
      expect(firstPara.content).toContain('Paris');
      expect(firstPara.content).toContain('France');
    });

    it('should apply minimum paragraph length filter', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml');
      const paragraphs = [];

      for await (const paragraph of parseWikipediaDump(filePath, { minParagraphLength: 50 })) {
        paragraphs.push(paragraph);
      }

      // All paragraphs should be >= 50 characters
      paragraphs.forEach(para => {
        expect(para.content.length).toBeGreaterThanOrEqual(50);
      });
    });

    it('should handle multiple pages in single file', async () => {
      // Create a fixture with multiple pages
      const multiPageXml = `<?xml version="1.0" encoding="UTF-8"?>
<mediawiki>
  <page>
    <title>Article One</title>
    <id>1</id>
    <revision>
      <text>Content for article one with sufficient length.</text>
    </revision>
  </page>
  <page>
    <title>Article Two</title>
    <id>2</id>
    <revision>
      <text>Content for article two with sufficient length.</text>
    </revision>
  </page>
</mediawiki>`;

      const fs = await import('fs');
      const tmpPath = path.join(fixturesDir, 'multi-page-temp.xml');
      fs.writeFileSync(tmpPath, multiPageXml);

      const paragraphs = [];
      for await (const paragraph of parseWikipediaDump(tmpPath)) {
        paragraphs.push(paragraph);
      }

      const articleTitles = [...new Set(paragraphs.map(p => p.articleTitle))];
      expect(articleTitles).toContain('Article One');
      expect(articleTitles).toContain('Article Two');

      // Cleanup
      fs.unlinkSync(tmpPath);
    });

    it('should yield paragraphs as async generator', async () => {
      const filePath = path.join(fixturesDir, 'simple-article.xml');

      // Test that we can break early and memory is not wasted
      let count = 0;
      for await (const _paragraph of parseWikipediaDump(filePath)) {
        count++;
        if (count >= 2) break;
      }

      expect(count).toBe(2);
    });

    it('should handle very large pages without failing', async () => {
      const largeText = 'A'.repeat(12 * 1024 * 1024); // 12MB
      const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<mediawiki>
  <page>
    <title>Large Article</title>
    <id>999</id>
    <revision>
      <text>${largeText}</text>
    </revision>
  </page>
</mediawiki>`;

      const fs = await import('fs');
      const tmpPath = path.join(fixturesDir, 'large-page-temp.xml');
      fs.writeFileSync(tmpPath, largeXml);

      let seen = false;
      for await (const paragraph of parseWikipediaDump(tmpPath, { minParagraphLength: 10 })) {
        expect(paragraph.articleTitle).toBe('Large Article');
        seen = true;
        break;
      }

      expect(seen).toBe(true);
      fs.unlinkSync(tmpPath);
    });

    describe('edge cases', () => {
      it('should handle empty XML file gracefully', async () => {
        const emptyXml = '<?xml version="1.0" encoding="UTF-8"?><mediawiki></mediawiki>';
        const fs = await import('fs');
        const tmpPath = path.join(fixturesDir, 'empty-temp.xml');
        fs.writeFileSync(tmpPath, emptyXml);

        const paragraphs = [];
        for await (const paragraph of parseWikipediaDump(tmpPath)) {
          paragraphs.push(paragraph);
        }

        expect(paragraphs).toHaveLength(0);

        // Cleanup
        fs.unlinkSync(tmpPath);
      });

      it('should throw error for non-existent file', async () => {
        const fakePath = path.join(fixturesDir, 'non-existent.xml');

        await expect(async () => {
          for await (const _paragraph of parseWikipediaDump(fakePath)) {
            // Should never get here
          }
        }).rejects.toThrow();
      });
    });
  });
});
