import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WikipediaPage, WikipediaParagraph } from '../../src/parser/types.js';
import type { StreamBlockRange } from '../../src/parser/multistream-index.js';

const {
  createBz2ReadStreamMock,
  parseSectionsMock,
  extractParagraphsFromSectionMock,
  streamXmlPagesMock,
} = vi.hoisted(() => ({
  createBz2ReadStreamMock: vi.fn(),
  parseSectionsMock: vi.fn(),
  extractParagraphsFromSectionMock: vi.fn(),
  streamXmlPagesMock: vi.fn(),
}));

vi.mock('../../src/parser/bz2-stream.js', () => ({
  createBz2ReadStream: createBz2ReadStreamMock,
}));

vi.mock('../../src/parser/section-parser.js', () => ({
  parseSections: parseSectionsMock,
}));

vi.mock('../../src/parser/paragraph-extractor.js', () => ({
  extractParagraphsFromSection: extractParagraphsFromSectionMock,
}));

vi.mock('../../src/parser/xml-stream.js', () => ({
  streamXmlPages: streamXmlPagesMock,
}));

import { readMultistreamParallel } from '../../src/parser/parallel-stream-reader.js';

const pageFactories = new Map<number, () => AsyncGenerator<WikipediaPage>>();

const createPage = (id: string, title: string, text: string): WikipediaPage => ({
  id,
  title,
  text,
  isRedirect: false,
});

describe('parallel-stream-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageFactories.clear();

    createBz2ReadStreamMock.mockImplementation((_filePath: string, options?: { start?: number }) => ({
      startOffset: options?.start ?? 0,
    }));

    streamXmlPagesMock.mockImplementation((stream: { startOffset: number }) => {
      const factory = pageFactories.get(stream.startOffset);

      if (!factory) {
        return (async function* emptyPages() {})();
      }

      return factory();
    });

    parseSectionsMock.mockImplementation((text: string) => [
      { name: '', content: text },
    ]);

    extractParagraphsFromSectionMock.mockImplementation(
      (articleTitle: string, sectionName: string, content: string) => [
        {
          articleTitle,
          sectionName,
          paragraphPosition: 0,
          content,
        },
      ],
    );
  });

  it('marks block completion callbacks even for blocks with zero yielded paragraphs', async () => {
    pageFactories.set(0, async function* firstBlock() {
      yield createPage('1', 'Alpha', 'Alpha content');
    });
    pageFactories.set(100, async function* emptyBlock() {});

    const blocks: StreamBlockRange[] = [
      { byteOffset: 0, endOffset: 99, articleIds: ['1'] },
      { byteOffset: 100, endOffset: -1, articleIds: ['2'] },
    ];

    const completed: number[] = [];
    const paragraphs: WikipediaParagraph[] = [];

    for await (const paragraph of readMultistreamParallel(
      '/tmp/dump.xml.bz2',
      blocks,
      2,
      {},
      (block) => {
        completed.push(block.byteOffset);
      },
    )) {
      paragraphs.push(paragraph);
    }

    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].articleId).toBe('1');
    expect(completed).toEqual([0, 100]);
  });

  it('yields from ready blocks without waiting for a whole Promise.all batch', async () => {
    let releaseSecondBlock: (() => void) | undefined;
    const secondBlockGate = new Promise<void>((resolve) => {
      releaseSecondBlock = resolve;
    });

    pageFactories.set(0, async function* firstBlock() {
      yield createPage('1', 'First', 'first content');
    });

    pageFactories.set(100, async function* secondBlock() {
      await secondBlockGate;
      yield createPage('2', 'Second', 'second content');
    });

    pageFactories.set(200, async function* thirdBlock() {
      yield createPage('3', 'Third', 'third content');
    });

    const blocks: StreamBlockRange[] = [
      { byteOffset: 0, endOffset: 99, articleIds: ['1'] },
      { byteOffset: 100, endOffset: 199, articleIds: ['2'] },
      { byteOffset: 200, endOffset: -1, articleIds: ['3'] },
    ];

    const iterator = readMultistreamParallel('/tmp/dump.xml.bz2', blocks, 2);

    const firstResult = await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out waiting for first yielded paragraph')), 250);
      }),
    ]);

    expect(firstResult.done).toBe(false);
    expect(firstResult.value?.articleId).toBe('1');

    expect(createBz2ReadStreamMock).toHaveBeenCalledWith(
      '/tmp/dump.xml.bz2',
      expect.objectContaining({ start: 200 }),
    );

    releaseSecondBlock?.();

    for await (const _paragraph of iterator) {
      // Drain remaining output
    }
  });
});
