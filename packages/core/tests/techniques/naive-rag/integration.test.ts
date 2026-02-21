import { describe, expect, it, vi } from 'vitest';
import type { PipelineContext } from '../../../src/types/pipeline-context.js';
import { PassthroughQueryAdapter } from '../../../src/techniques/naive-rag/query-adapter.js';
import { NaiveRagRetrievalAdapter } from '../../../src/techniques/naive-rag/retrieval-adapter.js';
import { NaiveRagGenerationAdapter } from '../../../src/techniques/naive-rag/generation-adapter.js';
import type { EmbeddingProvider } from '@wikirag/embeddings';
import type { SearchManager, SearchResult } from '@wikirag/qdrant';

function makeEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn(),
    getModelInfo: vi.fn().mockReturnValue({ provider: 'openai', model: 'test', dimensions: 3 }),
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  };
}

function makeSearchManager(paragraphText: string): SearchManager {
  const results: SearchResult[] = [
    {
      id: '1',
      score: 0.9,
      payload: {
        paragraphText,
        articleTitle: 'Quantum computing',
        sectionName: 'Introduction',
        paragraphPosition: 0,
        dumpVersion: '20260221',
        embeddingModel: 'text-embedding-3-small',
        embeddingProvider: 'openai',
      } as unknown as SearchResult['payload'],
    },
  ];

  return {
    similaritySearch: vi.fn().mockResolvedValue(results),
    similaritySearchWithVectors: vi.fn(),
    scrollPoints: vi.fn(),
    count: vi.fn(),
  } as unknown as SearchManager;
}

function makeOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Integrated response text.' } }],
        }),
      },
    },
  };
}

function makeInitialContext(query: string): PipelineContext {
  return {
    query,
    config: {
      topK: 5,
      collectionName: 'wiki-paragraph-openai-latest',
    },
    metadata: {},
  };
}

async function runNaiveRagPipeline(query: string): Promise<PipelineContext> {
  const queryAdapter = new PassthroughQueryAdapter();
  const retrievalAdapter = new NaiveRagRetrievalAdapter(
    makeEmbeddingProvider(),
    makeSearchManager('Qubits can be in superposition states.'),
  );
  const generationAdapter = new NaiveRagGenerationAdapter(makeOpenAIClient() as any);

  const initial = makeInitialContext(query);
  const afterQuery = await queryAdapter.execute(initial);
  const afterRetrieval = await retrievalAdapter.execute(afterQuery);
  return generationAdapter.execute(afterRetrieval);
}

describe('Naive RAG adapter integration', () => {
  it('executes query -> retrieval -> generation end-to-end', async () => {
    const finalContext = await runNaiveRagPipeline('What is quantum computing?');

    expect(finalContext.processedQuery).toBe('What is quantum computing?');
    expect(finalContext.retrievedDocuments).toHaveLength(1);
    expect(finalContext.retrievedDocuments?.[0]?.content).toBe(
      'Qubits can be in superposition states.',
    );
    expect(finalContext.response).toBe('Integrated response text.');
  });

  it.each([
    'What is the capital of Japan?',
    'Explain the significance of the Silk Road in global trade.',
    'that thing about the cat being alive and dead',
    'How should I evaluate this answer critically?',
  ])('supports query category scenario: %s', async (query) => {
    const finalContext = await runNaiveRagPipeline(query);

    expect(finalContext.processedQuery).toBe(query);
    expect(finalContext.response).toBe('Integrated response text.');
  });
});
