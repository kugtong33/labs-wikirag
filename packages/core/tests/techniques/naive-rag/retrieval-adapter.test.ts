/**
 * Tests for NaiveRagRetrievalAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NaiveRagRetrievalAdapter } from '../../../src/techniques/naive-rag/retrieval-adapter.js';
import type { PipelineContext } from '../../../src/types/pipeline-context.js';
import type { EmbeddingProvider } from '@wikirag/embeddings';
import type { SearchManager, SearchResult } from '@wikirag/qdrant';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const QUERY_VECTOR = [0.1, 0.2, 0.3];

function makeEmbeddingProvider(vector = QUERY_VECTOR): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue(vector),
    embedBatch: vi.fn(),
    getModelInfo: vi.fn().mockReturnValue({ provider: 'test', model: 'test', dimensions: 3 }),
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  };
}

function makeSearchResult(
  id: number,
  score: number,
  articleTitle: string,
  sectionName = ''
): SearchResult {
  return {
    id,
    score,
    payload: {
      articleTitle,
      sectionName,
      paragraphPosition: 0,
      dumpVersion: '20260215',
      embeddingModel: 'text-embedding-3-small',
      embeddingProvider: 'openai',
    },
  };
}

function makeSearchManager(results: SearchResult[] = []): SearchManager {
  return {
    similaritySearch: vi.fn().mockResolvedValue(results),
    similaritySearchWithVectors: vi.fn(),
    scrollPoints: vi.fn(),
    count: vi.fn(),
  } as unknown as SearchManager;
}

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    query: 'What is quantum computing?',
    processedQuery: 'What is quantum computing?',
    config: { topK: 5, collectionName: 'wiki-paragraph-openai-20260215' },
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NaiveRagRetrievalAdapter', () => {
  let embeddingProvider: EmbeddingProvider;
  let searchManager: SearchManager;
  let adapter: NaiveRagRetrievalAdapter;

  beforeEach(() => {
    embeddingProvider = makeEmbeddingProvider();
    searchManager = makeSearchManager([
      makeSearchResult(1, 0.92, 'Quantum computing', 'Introduction'),
      makeSearchResult(2, 0.88, 'Quantum mechanics', 'Applications'),
    ]);
    adapter = new NaiveRagRetrievalAdapter(embeddingProvider, searchManager);
  });

  it('has name "naive-rag-retrieval"', () => {
    expect(adapter.name).toBe('naive-rag-retrieval');
  });

  it('calls embed with the processedQuery string', async () => {
    const ctx = makeContext({ processedQuery: 'quantum computing' });
    await adapter.execute(ctx);
    expect(embeddingProvider.embed).toHaveBeenCalledWith('quantum computing');
  });

  it('falls back to context.query when processedQuery is undefined', async () => {
    const ctx = makeContext({ processedQuery: undefined });
    await adapter.execute(ctx);
    expect(embeddingProvider.embed).toHaveBeenCalledWith('What is quantum computing?');
  });

  it('calls similaritySearch with collection name, vector, and topK', async () => {
    const ctx = makeContext();
    await adapter.execute(ctx);
    expect(searchManager.similaritySearch).toHaveBeenCalledWith(
      'wiki-paragraph-openai-20260215',
      QUERY_VECTOR,
      5,
      undefined,
    );
  });

  it('passes scoreThreshold to similaritySearch when set', async () => {
    const ctx = makeContext({ config: { topK: 5, collectionName: 'test', scoreThreshold: 0.7 } });
    await adapter.execute(ctx);
    expect(searchManager.similaritySearch).toHaveBeenCalledWith('test', QUERY_VECTOR, 5, 0.7);
  });

  it('populates retrievedDocuments from search results', async () => {
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result.retrievedDocuments).toHaveLength(2);
  });

  it('maps article title and section name into content', async () => {
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result.retrievedDocuments![0].content).toBe('Quantum computing — Introduction');
    expect(result.retrievedDocuments![1].content).toBe('Quantum mechanics — Applications');
  });

  it('omits section separator when sectionName is empty', async () => {
    (searchManager.similaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeSearchResult(1, 0.9, 'Quantum computing', ''),
    ]);
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result.retrievedDocuments![0].content).toBe('Quantum computing');
  });

  it('preserves the score on each RetrievedDocument', async () => {
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result.retrievedDocuments![0].score).toBe(0.92);
    expect(result.retrievedDocuments![1].score).toBe(0.88);
  });

  it('preserves metadata on each RetrievedDocument', async () => {
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    const meta = result.retrievedDocuments![0].metadata;
    expect(meta.articleTitle).toBe('Quantum computing');
    expect(meta.sectionName).toBe('Introduction');
  });

  it('returns empty retrievedDocuments when search returns nothing', async () => {
    (searchManager.similaritySearch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result.retrievedDocuments).toEqual([]);
  });

  it('returns a new context object (immutability)', async () => {
    const ctx = makeContext();
    const result = await adapter.execute(ctx);
    expect(result).not.toBe(ctx);
  });
});
